export type EventSummary = {
  id: string;
  name: string;
  artist: string;
  venue: string;
  startsAt: string;
  genre: string;
  price: number;
  isFavourite: boolean;
  seatsAvailable: number;
};

export type Seat = {
  id: string;
  status: 'available' | 'held' | 'sold';
  mine: boolean;
};

export type EventDetail = EventSummary & { seats: Seat[] };

export type Hold = {
  id: string;
  eventId: string;
  seats: string[];
  expiresAt: string;
  expiresInMs: number;
};

export type Order = {
  id: string;
  eventId: string;
  seats: string[];
  total: number;
  status: 'pending' | 'confirmed';
  ticketCode: string | null;
  createdAt: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    let code = 'UNKNOWN';
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // keep the fallback message
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function listEvents(query: string, signal?: AbortSignal): Promise<EventSummary[]> {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  return request<EventSummary[]>(`/events${search}`, { signal });
}

export function getEvent(id: string, signal?: AbortSignal): Promise<EventDetail> {
  return request<EventDetail>(`/events/${encodeURIComponent(id)}`, { signal });
}

export function setFavourite(eventId: string, favourite: boolean): Promise<void> {
  return request<void>(`/favourites/${encodeURIComponent(eventId)}`, {
    method: favourite ? 'PUT' : 'DELETE',
  });
}

export function createHold(eventId: string, seats: string[]): Promise<Hold> {
  return request<Hold>('/holds', { method: 'POST', body: JSON.stringify({ eventId, seats }) });
}

export function releaseHold(id: string): Promise<void> {
  return request<void>(`/holds/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function createOrder(holdId: string): Promise<Order> {
  return request<Order>('/orders', { method: 'POST', body: JSON.stringify({ holdId }) });
}

export function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return request<Order>(`/orders/${encodeURIComponent(id)}`, { signal });
}
