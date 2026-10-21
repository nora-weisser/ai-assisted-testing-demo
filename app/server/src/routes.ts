import { Router, type Request, type Response } from 'express';
import { config, randomIn } from './config.js';
import * as store from './store.js';

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SEAT_UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'INTERNAL_ERROR';

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  extra: Record<string, unknown> = {},
): void {
  res.status(status).json({ error: { code, message, ...extra } });
}

export function userId(res: Response): string {
  return String(res.locals.userId);
}

function eventSummary(event: store.Event, uid: string) {
  return {
    ...event,
    isFavourite: store.isFavourite(uid, event.id),
    seatsAvailable: store.availableSeatCount(event.id),
  };
}

function holdBody(hold: store.Hold) {
  return {
    id: hold.id,
    eventId: hold.eventId,
    seats: hold.seats,
    expiresAt: new Date(hold.expiresAt).toISOString(),
    expiresInMs: Math.max(0, hold.expiresAt - Date.now()),
  };
}

function orderBody(order: store.Order) {
  const { userId: _owner, ...body } = order;
  return body;
}

export function apiRouter(): Router {
  const router = Router();

  router.get('/events', (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const uid = userId(res);
    res.json(store.searchEvents(query).map((event) => eventSummary(event, uid)));
  });

  router.get('/events/:id', (req, res) => {
    const event = store.findEvent(req.params.id);
    if (!event) {
      sendError(res, 404, 'NOT_FOUND', 'event not found');
      return;
    }
    const uid = userId(res);
    const seats = [...store.seatsFor(event.id).entries()].map(([id, seat]) => ({
      id,
      status: seat.status,
      mine: seat.status !== 'available' && seat.userId === uid,
    }));
    res.json({ ...eventSummary(event, uid), seats });
  });

  router.post('/holds', (req, res) => {
    const body: unknown = req.body;
    const eventId = typeof body === 'object' && body !== null && 'eventId' in body ? body.eventId : undefined;
    const seats = typeof body === 'object' && body !== null && 'seats' in body ? body.seats : undefined;

    if (typeof eventId !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'eventId is required', { field: 'eventId' });
      return;
    }
    if (
      !Array.isArray(seats) ||
      seats.length === 0 ||
      seats.length > store.MAX_SEATS_PER_HOLD ||
      !seats.every((seat): seat is string => typeof seat === 'string') ||
      new Set(seats).size !== seats.length
    ) {
      sendError(
        res,
        400,
        'VALIDATION_ERROR',
        `seats must be 1 to ${store.MAX_SEATS_PER_HOLD} distinct seat ids`,
        { field: 'seats' },
      );
      return;
    }
    if (!store.findEvent(eventId)) {
      sendError(res, 404, 'NOT_FOUND', 'event not found');
      return;
    }

    const result = store.createHold(userId(res), eventId, seats, config.holdSeconds * 1000);
    if (!result.ok) {
      if (result.reason === 'unknown-seat') {
        sendError(res, 400, 'VALIDATION_ERROR', `unknown seat: ${result.seats.join(', ')}`, {
          field: 'seats',
        });
        return;
      }
      sendError(res, 409, 'SEAT_UNAVAILABLE', `seat no longer available: ${result.seats.join(', ')}`, {
        seats: result.seats,
      });
      return;
    }
    res.status(201).json(holdBody(result.hold));
  });

  router.get('/holds/:id', (req, res) => {
    const hold = store.findHold(req.params.id);
    if (!hold || hold.userId !== userId(res)) {
      sendError(res, 404, 'NOT_FOUND', 'hold not found');
      return;
    }
    res.json(holdBody(hold));
  });

  router.delete('/holds/:id', (req, res) => {
    const hold = store.findHold(req.params.id);
    if (!hold || hold.userId !== userId(res)) {
      sendError(res, 404, 'NOT_FOUND', 'hold not found');
      return;
    }
    store.releaseHold(hold.id);
    res.status(204).end();
  });

  router.post('/orders', (req, res) => {
    const body: unknown = req.body;
    const holdId = typeof body === 'object' && body !== null && 'holdId' in body ? body.holdId : undefined;
    if (typeof holdId !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'holdId is required', { field: 'holdId' });
      return;
    }

    const hold = store.findHold(holdId);
    if (!hold || hold.userId !== userId(res)) {
      sendError(res, 409, 'HOLD_EXPIRED', 'this hold has expired or does not exist');
      return;
    }

    const order = store.createOrder(hold);
    // Payment is confirmed asynchronously, the way a payment provider webhook would.
    setTimeout(() => store.confirmOrder(order.id), randomIn(config.paymentProcessing));
    res.status(202).json(orderBody(order));
  });

  router.get('/orders', (_req, res) => {
    res.json(store.ordersFor(userId(res)).map(orderBody));
  });

  router.get('/orders/:id', (req, res) => {
    const order = store.findOrder(req.params.id);
    if (!order || order.userId !== userId(res)) {
      sendError(res, 404, 'NOT_FOUND', 'order not found');
      return;
    }
    res.json(orderBody(order));
  });

  router.put('/favourites/:eventId', (req, res) => {
    if (!store.findEvent(req.params.eventId)) {
      sendError(res, 404, 'NOT_FOUND', 'event not found');
      return;
    }
    store.setFavourite(userId(res), req.params.eventId, true);
    res.status(204).end();
  });

  router.delete('/favourites/:eventId', (req, res) => {
    if (!store.findEvent(req.params.eventId)) {
      sendError(res, 404, 'NOT_FOUND', 'event not found');
      return;
    }
    store.setFavourite(userId(res), req.params.eventId, false);
    res.status(204).end();
  });

  return router;
}

/** Mounted only when ENABLE_TEST_ROUTES=true. */
export function testRouter(): Router {
  const router = Router();

  // Clears what the calling user (cookie) owns: holds, orders, favourites.
  router.post('/reset', (_req, res) => {
    store.resetUser(userId(res));
    res.status(204).end();
  });

  // Clears everything for everyone. For a clean start before a whole run.
  router.post('/reset-all', (_req, res) => {
    store.resetAll();
    res.status(204).end();
  });

  return router;
}
