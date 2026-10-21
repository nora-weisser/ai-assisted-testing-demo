/** Response shapes of the Front Row API, as documented in ../../docs/app.md. */

export type HoldResponse = {
  id: string;
  eventId: string;
  seats: string[];
  expiresAt: string;
  expiresInMs: number;
};

export type OrderResponse = {
  id: string;
  eventId: string;
  seats: string[];
  total: number;
  status: 'pending' | 'confirmed';
  ticketCode: string | null;
  createdAt: string;
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    field?: string;
    seats?: string[];
  };
};
