/**
 * Utility functions to prefetch lazy-loaded page chunks.
 * Calling these functions will trigger the browser to start downloading the JS chunk
 * before the user actually clicks the link, making navigation feel instant.
 */

export const prefetchRoutes: Record<string, () => Promise<any>> = {
  "/history": () => import("../pages/History"),
  "/analytics": () => import("../pages/Analytics"),
  "/profile": () => import("../pages/Profile"),
  "/chat": () => import("../pages/Chat"),
  "/admin": () => import("../pages/Admin"),
};

export const prefetchRoute = (path: string) => {
  const fetcher = prefetchRoutes[path];
  if (fetcher) {
    fetcher().catch(() => {
        // Silently fail if prefetch fails, the browser will try again on click anyway
    });
  }
};
