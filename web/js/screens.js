// The screens: each screen module registers the element that shows its
// route name and the data it needs, side by side, so adding a screen means
// its own file plus one router line. The app shell asks here which element
// to show; data.refresh asks here what to load.
const screens = new Map(); // route name -> { tag, load }

// screen registers route name as shown by element tag; load fetches what it
// needs and runs whenever the route, ledger or connection changes.
export function screen(name, tag, load = () => {}) {
  screens.set(name, { tag, load });
}

// screenTag is the element for route name, or undefined.
export const screenTag = (name) => screens.get(name)?.tag;

// loadScreen fetches the data route name needs.
export function loadScreen(name) {
  screens.get(name)?.load();
}
