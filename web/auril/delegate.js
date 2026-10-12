/**
 * Event delegation: handler(event, match) fires when event.target matches selector within root.
 * Non-bubbling events (`focus`, `blur`, `mouseenter`, `mouseleave`) never reach
 * `root` in the bubble phase — pass `{ capture: true }` in `opts` to catch those.
 * @param {Element | Document} root
 * @param {string} type
 * @param {string} selector
 * @param {(event: Event, match: Element) => void} handler
 * @param {AddEventListenerOptions} [opts]
 */
export function delegate(root, type, selector, handler, opts = {}) {
  root.addEventListener(type, (event) => {
    const node = event.target;
    const target = node instanceof Element ? node : node instanceof Node ? node.parentElement : null;
    const match = target?.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  }, opts);
}
