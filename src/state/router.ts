/** Small hash router with no dependency. Keyboard and back button work. */
import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { readonly name: 'overview' }
  | { readonly name: 'event'; readonly id: string }
  | { readonly name: 'analysis'; readonly id: string }
  | { readonly name: 'approve'; readonly id: string }
  | { readonly name: 'history' }
  | { readonly name: 'settings' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [head = '', tail = ''] = path.split('/');
  switch (head) {
    case 'event':
      return tail ? { name: 'event', id: decodeURIComponent(tail) } : { name: 'overview' };
    case 'analysis':
      return tail ? { name: 'analysis', id: decodeURIComponent(tail) } : { name: 'overview' };
    case 'approve':
      return tail ? { name: 'approve', id: decodeURIComponent(tail) } : { name: 'overview' };
    case 'history':
      return { name: 'history' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'overview' };
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'overview':
      return '#/';
    case 'history':
      return '#/history';
    case 'settings':
      return '#/settings';
    default:
      return `#/${route.name}/${encodeURIComponent(route.id)}`;
  }
}

export function useRoute(): { route: Route; navigate: (route: Route) => void } {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(typeof window === 'undefined' ? '' : window.location.hash),
  );

  useEffect(() => {
    const onHashChange = (): void => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = hrefFor(next);
  }, []);

  return { route, navigate };
}
