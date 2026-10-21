import { useEffect, useState } from 'react';
import * as api from '../api';
import { FavouriteButton } from '../components/FavouriteButton';
import { formatDate, formatPrice } from '../format';
import { Link } from '../router';

const SEARCH_DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function EventsPage({ onError }: { onError: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<api.EventSummary[] | null>(null);
  const debouncedQuery = useDebounced(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    // Each search aborts the previous one, so a slow early response can never
    // overwrite the results of a later query.
    const controller = new AbortController();
    api
      .listEvents(debouncedQuery, controller.signal)
      .then(setEvents)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          onError(cause instanceof Error ? cause.message : 'Could not load events');
        }
      });
    return () => controller.abort();
  }, [debouncedQuery, onError]);

  const summary =
    events === null
      ? 'Loading events…'
      : `Showing ${events.length} ${events.length === 1 ? 'event' : 'events'}`;

  return (
    <section className="events">
      <h1>Upcoming events</h1>

      <div className="search">
        <label htmlFor="search">Search events</label>
        <input
          id="search"
          type="search"
          placeholder="Artist, venue or genre"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <p role="status" className="summary">
        {summary}
      </p>

      {events !== null && events.length === 0 && (
        <p className="empty-state">No events match “{debouncedQuery.trim()}”.</p>
      )}

      {events !== null && events.length > 0 && (
        <ul className="event-list" aria-label="Events">
          {events.map((event) => (
            <li key={event.id} className="event-card">
              <div className="event-date">{formatDate(event.startsAt)}</div>
              <h2>
                <Link to={`/events/${event.id}`}>{event.name}</Link>
              </h2>
              <p className="event-meta">
                {event.artist} · {event.venue}
              </p>
              <p className="event-footer">
                <span className="tag">{event.genre}</span>
                <span>from {formatPrice(event.price)}</span>
                <span>{event.seatsAvailable} seats left</span>
              </p>
              <FavouriteButton
                eventId={event.id}
                eventName={event.name}
                initial={event.isFavourite}
                onError={onError}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
