/**
 * Disable all console output in production builds.
 * Development (`npm run dev`) keeps normal console behavior.
 */
if (import.meta.env.PROD) {
  const noop = () => {};

  for (const method of [
    "log",
    "debug",
    "info",
    "warn",
    "error",
    "trace",
    "table",
    "group",
    "groupCollapsed",
    "groupEnd",
    "time",
    "timeEnd",
    "timeLog",
    "count",
    "countReset",
    "assert",
    "clear",
    "dir",
    "dirxml",
  ]) {
    if (typeof console[method] === "function") {
      console[method] = noop;
    }
  }
}
