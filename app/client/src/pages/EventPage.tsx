import { useCallback, useEffect, useState } from 'react';
import * as api from '../api';
import { formatCountdown, formatDate, formatPrice } from '../format';
import { Link, useRouter } from '../router';

type ActiveHold = {
  id: string;
  seats: string[];
  /** Deadline on this browser's clock, derived from the server's expiresInMs. */
  deadline: number;
};

const TICK_MS = 1000;

export function EventPage({ eventId }: { eventId: string }) {
  const { navigate } = useRouter();
  const [event, setEvent] = useState<api.EventDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [hold, setHold] = useState<ActiveHold | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvent(await api.getEvent(eventId));
    } catch (cause) {
      if (cause instanceof api.ApiError && cause.status === 404) {
        setNotFound(true);
        return;
      }
      setMessage(cause instanceof Error ? cause.message : 'Could not load this event');
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The countdown re-renders once a second and expires the hold when it runs out.
  useEffect(() => {
    if (!hold) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= hold.deadline) {
        window.clearInterval(timer);
        setHold(null);
        setSelected([]);
        setMessage('Your hold expired and the seats were released.');
        api
          .releaseHold(hold.id)
          .catch(() => undefined)
          .finally(() => void load());
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [hold, load]);

  function toggleSeat(id: string) {
    setMessage(null);
    setSelected((current) => (current.includes(id) ? current.filter((seat) => seat !== id) : [...current, id]));
  }

  async function holdSeats() {
    setBusy(true);
    setMessage(null);
    try {
      const created = await api.createHold(eventId, selected);
      setNow(Date.now());
      setHold({ id: created.id, seats: created.seats, deadline: Date.now() + created.expiresInMs });
      await load();
    } catch (cause) {
      if (cause instanceof api.ApiError && cause.code === 'SEAT_UNAVAILABLE') {
        setMessage('Sorry, someone else just took one of those seats. Please choose again.');
        setSelected([]);
        await load();
      } else {
        setMessage(cause instanceof Error ? cause.message : 'Could not hold these seats');
      }
    } finally {
      setBusy(false);
    }
  }

  async function releaseSeats() {
    if (!hold) {
      return;
    }
    setBusy(true);
    try {
      await api.releaseHold(hold.id);
      setHold(null);
      setSelected([]);
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not release these seats');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!hold) {
      return;
    }
    setBusy(true);
    try {
      const order = await api.createOrder(hold.id);
      navigate(`/orders/${order.id}`);
    } catch (cause) {
      setHold(null);
      setSelected([]);
      setMessage(cause instanceof Error ? cause.message : 'Payment failed');
      setBusy(false);
      await load();
    }
  }

  if (notFound) {
    return (
      <section>
        <h1>Event not found</h1>
        <p>
          <Link to="/">Back to all events</Link>
        </p>
      </section>
    );
  }

  if (!event) {
    return (
      <section>
        <p role="status">Loading event…</p>
      </section>
    );
  }

  const rows = [...new Set(event.seats.map((seat) => seat.id.charAt(0)))];
  const chosen = hold ? hold.seats : selected;
  const total = event.price * chosen.length;

  return (
    <section className="event-page">
      <p className="back">
        <Link to="/">← All events</Link>
      </p>
      <h1>{event.name}</h1>
      <p className="event-meta">
        {event.artist} · {event.venue} · {formatDate(event.startsAt)}
      </p>

      {message && (
        <div className="alert" role="alert">
          {message}
        </div>
      )}

      <div className="stage" aria-hidden="true">
        Stage
      </div>

      <div className="seat-map" role="group" aria-label="Seats">
        {rows.map((row) => (
          <div className="seat-row" key={row}>
            <span className="row-label" aria-hidden="true">
              {row}
            </span>
            {event.seats
              .filter((seat) => seat.id.startsWith(row))
              .map((seat) => {
                const isChosen = chosen.includes(seat.id);
                const unavailable = seat.status !== 'available' && !(hold && seat.mine && isChosen);
                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={`seat ${seat.status} ${isChosen ? 'chosen' : ''}`}
                    aria-label={`Seat ${seat.id}`}
                    aria-pressed={isChosen}
                    disabled={unavailable || hold !== null || busy}
                    onClick={() => toggleSeat(seat.id)}
                  >
                    {seat.id.slice(1)}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      <ul className="legend" aria-hidden="true">
        <li>
          <span className="seat sample" /> Available
        </li>
        <li>
          <span className="seat sample chosen" /> Your selection
        </li>
        <li>
          <span className="seat sample sold" /> Taken
        </li>
      </ul>

      <div className="checkout">
        <p className="selection">
          {chosen.length === 0
            ? 'Choose up to 6 seats.'
            : `${chosen.length} ${chosen.length === 1 ? 'seat' : 'seats'} selected: ${chosen.join(', ')} · ${formatPrice(total)}`}
        </p>

        {hold ? (
          <div className="hold">
            <p role="status" className="countdown">
              Hold expires in {formatCountdown(hold.deadline - now)}
            </p>
            <div className="actions">
              <button type="button" className="primary" onClick={pay} disabled={busy}>
                Pay {formatPrice(total)}
              </button>
              <button type="button" onClick={releaseSeats} disabled={busy}>
                Release seats
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={holdSeats}
            disabled={busy || selected.length === 0 || selected.length > 6}
          >
            Hold seats
          </button>
        )}
      </div>
    </section>
  );
}
