// The screens: each screen module registers the element that shows its
// route name, the data it needs and its title, side by side, so adding a
// screen means its own file plus one router line. The app shell asks here
// which element to show, the top bar which title, data.refresh what to load.
const screens = new Map(); // route name -> { tag, load, title }

// screen registers route name as shown by element tag. load fetches what it
// needs and runs whenever the route, ledger or connection changes; title
// answers the page title for the top bar from the state.
export function screen(name, tag, { load = () => {}, title = () => '' } = {}) {
  screens.set(name, { tag, load, title });
}

// screenTag is the element for route name, or undefined.
export const screenTag = (name) => screens.get(name)?.tag;

// screenTitle is the page title of route name in state.
export const screenTitle = (name, state) => screens.get(name)?.title(state) ?? '';

// loadScreen fetches the data route name needs.
export function loadScreen(name) {
  screens.get(name)?.load();
}
