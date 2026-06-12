// Stub for `server-only` / `client-only` in the Vitest (Node) environment.
// These packages are provided by Next's bundler at build time and aren't
// resolvable by Vite. They are no-ops on the server, so an empty module is a
// faithful stand-in for tests that import server-only library code directly.
export {};
