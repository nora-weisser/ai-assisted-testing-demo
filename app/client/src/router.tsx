import { createContext, useContext, useEffect, useState, type MouseEvent, type ReactNode } from 'react';

type Router = {
  path: string;
  navigate: (to: string) => void;
};

const RouterContext = createContext<Router>({ path: '/', navigate: () => undefined });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(to: string) {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter(): Router {
  return useContext(RouterContext);
}

export function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const { navigate } = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
