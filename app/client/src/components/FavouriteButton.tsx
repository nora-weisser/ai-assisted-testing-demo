import { useEffect, useState } from 'react';
import * as api from '../api';

type Props = {
  eventId: string;
  eventName: string;
  initial: boolean;
  onError: (message: string) => void;
};

/**
 * Optimistic: the heart flips the moment it is clicked and the request is sent
 * in the background. If the server rejects it, the heart flips back.
 */
export function FavouriteButton({ eventId, eventName, initial, onError }: Props) {
  const [pressed, setPressed] = useState(initial);

  useEffect(() => setPressed(initial), [initial]);

  function toggle() {
    const next = !pressed;
    setPressed(next);
    api.setFavourite(eventId, next).catch((cause: unknown) => {
      setPressed(!next);
      onError(cause instanceof Error ? cause.message : 'Could not update favourites');
    });
  }

  return (
    <button
      type="button"
      className="favourite"
      aria-label={`Favourite ${eventName}`}
      aria-pressed={pressed}
      onClick={toggle}
    >
      <span aria-hidden="true">{pressed ? '♥' : '♡'}</span>
    </button>
  );
}
