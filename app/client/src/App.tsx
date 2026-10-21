import { useCallback, useState } from 'react';
import { EventPage } from './pages/EventPage';
import { EventsPage } from './pages/EventsPage';
import { OrderPage } from './pages/OrderPage';
import { Link, RouterProvider, useRouter } from './router';

function Routes() {
  const { path } = useRouter();
  const [error, setError] = useState<string | null>(null);
  const report = useCallback((message: string) => setError(message), []);

  const pathname = path.split('?')[0] ?? '/';
  const eventMatch = /^\/events\/([^/]+)$/.exec(pathname);
  const orderMatch = /^\/orders\/([^/]+)$/.exec(pathname);

  let page;
  if (eventMatch?.[1]) {
    page = <EventPage key={eventMatch[1]} eventId={decodeURIComponent(eventMatch[1])} />;
  } else if (orderMatch?.[1]) {
    page = <OrderPage key={orderMatch[1]} orderId={decodeURIComponent(orderMatch[1])} />;
  } else {
    page = <EventsPage onError={report} />;
  }

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span aria-hidden="true">●</span> Front Row
        </Link>
      </header>
      <main className="app">
        {error && (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {page}
      </main>
    </>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
