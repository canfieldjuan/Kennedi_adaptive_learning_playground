/**
 * Simple hash-based router.
 * Routes: #home, #parent, #activity/:id
 * No external dependencies.
 */

export type Route =
  | { view: 'home' }
  | { view: 'parent' }
  | { view: 'story-stage' }
  | { view: 'activity'; activityId: string };

type RouteChangeHandler = (route: Route) => void;

let _handler: RouteChangeHandler | null = null;

/**
 * Parse the current hash into a Route.
 */
export function parseRoute(): Route {
  const hash = window.location.hash.replace('#', '') || 'home';

  if (hash === 'parent') {
    return { view: 'parent' };
  }

  if (hash === 'story-stage') {
    return { view: 'story-stage' };
  }

  if (hash.startsWith('activity/')) {
    const activityId = hash.slice('activity/'.length);
    return { view: 'activity', activityId };
  }

  return { view: 'home' };
}

/**
 * Navigate to a new route.
 */
export function navigate(route: Route): void {
  switch (route.view) {
    case 'home':
      window.location.hash = '#home';
      break;
    case 'parent':
      window.location.hash = '#parent';
      break;
    case 'story-stage':
      window.location.hash = '#story-stage';
      break;
    case 'activity':
      window.location.hash = `#activity/${route.activityId}`;
      break;
  }
}

/**
 * Listen for hash changes and call the handler with the parsed route.
 */
export function onRouteChange(handler: RouteChangeHandler): void {
  _handler = handler;
  window.addEventListener('hashchange', () => {
    _handler?.(parseRoute());
  });
}

/**
 * Trigger the handler with the current route (for initial load).
 */
export function initRouter(handler: RouteChangeHandler): void {
  onRouteChange(handler);
  handler(parseRoute());
}
