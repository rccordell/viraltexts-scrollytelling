import { useEffect, useState } from "react";

export type Route = { name: "landing" } | { name: "exhibit"; slug: string };

function parseHash(hash: string): Route {
  const match = hash.match(/^#\/e\/([^/]+)\/?$/);
  if (match) return { name: "exhibit", slug: match[1] };
  return { name: "landing" };
}

/** Minimal hash-based router — avoids needing server rewrite rules on static hosts. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

export function exhibitHref(slug: string): string {
  return `#/e/${slug}`;
}
