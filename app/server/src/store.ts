import { randomUUID } from 'node:crypto';

/**
 * In-memory state for Front Row. Events are fixed reference data; everything
 * else (holds, orders, favourites) belongs to the user identified by the
 * `fr_uid` cookie. Seats are the one thing every user shares.
 */

export type Event = {
  id: string;
  name: string;
  artist: string;
  venue: string;
  startsAt: string;
  genre: string;
  price: number;
};

export type SeatState =
  | { status: 'available' }
  | { status: 'held'; holdId: string; userId: string }
  | { status: 'sold'; orderId: string; userId: string };

export type Hold = {
  id: string;
  userId: string;
  eventId: string;
  seats: string[];
  expiresAt: number;
};

export type OrderStatus = 'pending' | 'confirmed';

export type Order = {
  id: string;
  userId: string;
  eventId: string;
  seats: string[];
  total: number;
  status: OrderStatus;
  ticketCode: string | null;
  createdAt: string;
};

export const EVENTS: readonly Event[] = [
  {
    id: 'late-night-jazz-trio',
    name: 'Late Night Jazz Trio',
    artist: 'The Blue Notes',
    venue: 'The Blue Room',
    startsAt: '2027-02-12T21:00:00.000Z',
    genre: 'Jazz',
    price: 35,
  },
  {
    id: 'jazz-under-the-stars',
    name: 'Jazz Under the Stars',
    artist: 'Mira Okafor Quartet',
    venue: 'Rooftop Stage',
    startsAt: '2027-02-20T20:00:00.000Z',
    genre: 'Jazz',
    price: 45,
  },
  {
    id: 'indie-rock-night',
    name: 'Indie Rock Night',
    artist: 'Paper Lanterns',
    venue: 'The Foundry',
    startsAt: '2027-03-05T19:30:00.000Z',
    genre: 'Rock',
    price: 30,
  },
  {
    id: 'beethoven-ninth',
    name: 'Beethoven: Symphony No. 9',
    artist: 'City Chamber Orchestra',
    venue: 'Grand Hall',
    startsAt: '2027-03-14T19:00:00.000Z',
    genre: 'Classical',
    price: 60,
  },
  {
    id: 'warehouse-techno',
    name: 'Warehouse Techno',
    artist: 'DJ Kestrel',
    venue: 'Old Gasworks',
    startsAt: '2027-03-27T22:00:00.000Z',
    genre: 'Electronic',
    price: 40,
  },
  {
    id: 'folk-on-the-canal',
    name: 'Folk on the Canal',
    artist: 'Willow & Reed',
    venue: 'Canal House Stage',
    startsAt: '2027-04-09T18:30:00.000Z',
    genre: 'Folk',
    price: 25,
  },
];

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const SEATS_PER_ROW = 8;
export const MAX_SEATS_PER_HOLD = 6;

const seatsByEvent = new Map<string, Map<string, SeatState>>();
const holds = new Map<string, Hold>();
const orders = new Map<string, Order>();
const favourites = new Map<string, Map<string, number>>();

function emptySeatMap(): Map<string, SeatState> {
  const seats = new Map<string, SeatState>();
  for (const row of ROWS) {
    for (let number = 1; number <= SEATS_PER_ROW; number += 1) {
      seats.set(`${row}${number}`, { status: 'available' });
    }
  }
  return seats;
}

function seatMap(eventId: string): Map<string, SeatState> {
  let seats = seatsByEvent.get(eventId);
  if (!seats) {
    seats = emptySeatMap();
    seatsByEvent.set(eventId, seats);
  }
  return seats;
}

export function findEvent(id: string): Event | undefined {
  return EVENTS.find((event) => event.id === id);
}

export function searchEvents(query: string): Event[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? EVENTS.filter((event) =>
        [event.name, event.artist, event.genre, event.venue].some((field) =>
          field.toLowerCase().includes(needle),
        ),
      )
    : [...EVENTS];
  return matches.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Holds expire lazily: anything past its deadline is released on the next read. */
export function sweepExpiredHolds(now = Date.now()): void {
  for (const hold of holds.values()) {
    if (hold.expiresAt <= now) {
      releaseHold(hold.id);
    }
  }
}

export function seatsFor(eventId: string): Map<string, SeatState> {
  sweepExpiredHolds();
  return seatMap(eventId);
}

export function availableSeatCount(eventId: string): number {
  let count = 0;
  for (const seat of seatsFor(eventId).values()) {
    if (seat.status === 'available') {
      count += 1;
    }
  }
  return count;
}

export type HoldResult =
  | { ok: true; hold: Hold }
  | { ok: false; reason: 'unknown-seat'; seats: string[] }
  | { ok: false; reason: 'unavailable'; seats: string[] };

export function createHold(userId: string, eventId: string, requested: string[], holdMs: number): HoldResult {
  const seats = seatsFor(eventId);

  const unknown = requested.filter((id) => !seats.has(id));
  if (unknown.length > 0) {
    return { ok: false, reason: 'unknown-seat', seats: unknown };
  }

  const taken = requested.filter((id) => seats.get(id)?.status !== 'available');
  if (taken.length > 0) {
    return { ok: false, reason: 'unavailable', seats: taken };
  }

  const hold: Hold = {
    id: randomUUID(),
    userId,
    eventId,
    seats: [...requested],
    expiresAt: Date.now() + holdMs,
  };
  for (const id of requested) {
    seats.set(id, { status: 'held', holdId: hold.id, userId });
  }
  holds.set(hold.id, hold);
  return { ok: true, hold };
}

export function findHold(id: string): Hold | undefined {
  sweepExpiredHolds();
  return holds.get(id);
}

export function releaseHold(id: string): boolean {
  const hold = holds.get(id);
  if (!hold) {
    return false;
  }
  const seats = seatMap(hold.eventId);
  for (const seatId of hold.seats) {
    const seat = seats.get(seatId);
    if (seat?.status === 'held' && seat.holdId === hold.id) {
      seats.set(seatId, { status: 'available' });
    }
  }
  holds.delete(id);
  return true;
}

function ticketCode(): string {
  return `FR-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/** Converts a hold into a pending order. Payment is confirmed later by `confirmOrder`. */
export function createOrder(hold: Hold): Order {
  const event = findEvent(hold.eventId);
  const order: Order = {
    id: randomUUID(),
    userId: hold.userId,
    eventId: hold.eventId,
    seats: hold.seats,
    total: (event?.price ?? 0) * hold.seats.length,
    status: 'pending',
    ticketCode: null,
    createdAt: new Date().toISOString(),
  };

  const seats = seatMap(hold.eventId);
  for (const seatId of hold.seats) {
    seats.set(seatId, { status: 'sold', orderId: order.id, userId: hold.userId });
  }
  holds.delete(hold.id);
  orders.set(order.id, order);
  return order;
}

export function confirmOrder(id: string): void {
  const order = orders.get(id);
  // The order may have been cleaned up by a reset while payment was processing.
  if (order && order.status === 'pending') {
    orders.set(id, { ...order, status: 'confirmed', ticketCode: ticketCode() });
  }
}

export function findOrder(id: string): Order | undefined {
  return orders.get(id);
}

export function ordersFor(userId: string): Order[] {
  return [...orders.values()]
    .filter((order) => order.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function isFavourite(userId: string, eventId: string): boolean {
  return favourites.get(userId)?.has(eventId) ?? false;
}

export function setFavourite(userId: string, eventId: string, value: boolean): void {
  let mine = favourites.get(userId);
  if (!mine) {
    mine = new Map();
    favourites.set(userId, mine);
  }
  if (value) {
    if (!mine.has(eventId)) {
      mine.set(eventId, Date.now());
    }
  } else {
    mine.delete(eventId);
  }
}

/** Removes everything one user owns and gives their seats back. */
export function resetUser(userId: string): void {
  for (const hold of [...holds.values()]) {
    if (hold.userId === userId) {
      releaseHold(hold.id);
    }
  }
  for (const order of [...orders.values()]) {
    if (order.userId !== userId) {
      continue;
    }
    const seats = seatMap(order.eventId);
    for (const seatId of order.seats) {
      const seat = seats.get(seatId);
      if (seat?.status === 'sold' && seat.orderId === order.id) {
        seats.set(seatId, { status: 'available' });
      }
    }
    orders.delete(order.id);
  }
  favourites.delete(userId);
}

export function resetAll(): void {
  seatsByEvent.clear();
  holds.clear();
  orders.clear();
  favourites.clear();
}
