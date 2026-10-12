/** Dev mode: add ?auril-dev to the URL, or set dev.enabled = true at startup. */
export const dev = {
  enabled: typeof location !== 'undefined' && new URLSearchParams(location.search).has('auril-dev'),
  /** @param {...unknown} args */
  log(...args) {
    // `dev.enabled`, not `this.enabled` — so a destructured `const { log } = dev`
    // keeps working.
    if (dev.enabled) console.debug('[auril]', ...args);
  },
};
