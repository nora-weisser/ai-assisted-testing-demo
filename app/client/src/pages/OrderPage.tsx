import { useEffect, useState } from 'react';
import * as api from '../api';
import { formatPrice } from '../format';
import { Link } from '../router';

const POLL_MS = 500;

export function OrderPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<api.Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment is confirmed in the background, so the page polls until it is.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const latest = await api.getOrder(orderId);
        if (cancelled) {
          return;
        }
        setOrder(latest);
        if (latest.status === 'pending') {
          timer = window.setTimeout(poll, POLL_MS);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load this booking');
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderId]);

  if (error) {
    return (
      <section>
        <h1>Booking not found</h1>
        <p role="alert">{error}</p>
        <p>
          <Link to="/">Back to all events</Link>
        </p>
      </section>
    );
  }

  if (!order || order.status === 'pending') {
    return (
      <section className="order">
        <h1>Processing your payment…</h1>
        <p className="muted">This usually takes a moment. Please don't close this page.</p>
        <div className="spinner" aria-hidden="true" />
      </section>
    );
  }

  return (
    <section className="order confirmed">
      <h1>Booking confirmed</h1>
      <dl className="ticket">
        <dt>Ticket code</dt>
        <dd>{order.ticketCode}</dd>
        <dt>Seats</dt>
        <dd>{order.seats.join(', ')}</dd>
        <dt>Total paid</dt>
        <dd>{formatPrice(order.total)}</dd>
      </dl>
      <p>
        <Link to="/">Find more events</Link>
      </p>
    </section>
  );
}
