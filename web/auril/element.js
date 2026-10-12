import { morph } from './morph.js';
import { delegate } from './delegate.js';
import { dev } from './dev.js';

/**
 * Optional hooks a subclass may define.
 * @typedef {object} Hooks
 * @property {() => void} [onConnect]    invoked on connect; attach listeners/watches here
 * @property {() => void} [onDisconnect] invoked on disconnect, after auto-cleanup
 * @property {() => unknown} [render]    if defined, update() morphs the DOM to its result
 */

export class AurilElement extends HTMLElement {
  /**
   * Shared app store — assign once at startup: AurilElement.store = new Store({...})
   * @type {import('./store.js').Store<any> | null}
   */
  static store = null;

  /** @type {AbortController | undefined} */
  _ac;
  /** @type {AbortSignal | undefined} */
  signal;
  /** @type {string | undefined} */
  #lastHtml;

  connectedCallback() {
    this._ac = new AbortController();
    this.signal = this._ac.signal;
    this.#lastHtml = undefined; // DOM may have changed while detached — morph fresh

    const self = /** @type {AurilElement & Hooks} */ (this);
    self.onConnect?.();
    if (self.render) this.update();
    dev.log('connect', this.localName);
  }

  disconnectedCallback() {
    this._ac?.abort();
    /** @type {AurilElement & Hooks} */ (this).onDisconnect?.();
    dev.log('disconnect', this.localName);
  }

  /**
   * addEventListener that is removed automatically on disconnect. A caller-
   * provided opts.signal is combined via AbortSignal.any — either signal
   * removes the listener.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} handler
   * @param {AddEventListenerOptions} [opts]
   */
  on(target, type, handler, opts = {}) {
    this.#assertLive('on');
    const signal = /** @type {AbortSignal} */ (this.signal);
    target.addEventListener(type, handler, { ...opts, signal: opts.signal ? AbortSignal.any([signal, opts.signal]) : signal });
  }

  /**
   * delegate() scoped to this element, auto-removed on disconnect. A caller-
   * provided opts.signal is combined via AbortSignal.any — either signal
   * removes the listener.
   * @param {string} type
   * @param {string} selector
   * @param {(event: Event, match: Element) => void} handler
   * @param {AddEventListenerOptions} [opts]
   */
  delegate(type, selector, handler, opts = {}) {
    this.#assertLive('delegate');
    const signal = /** @type {AbortSignal} */ (this.signal);
    delegate(this, type, selector, handler, { ...opts, signal: opts.signal ? AbortSignal.any([signal, opts.signal]) : signal });
  }

  /**
   * Guard for the connect-scoped methods. Checks `aborted`, not just presence:
   * `disconnectedCallback` leaves `this.signal` in place, and addEventListener
   * with an already-aborted signal is a silent no-op — so an async callback
   * landing after disconnect would otherwise register nothing and say nothing.
   * @param {string} method
   */
  #assertLive(method) {
    if (!this.signal) throw new Error(`[auril] <${this.localName}>: ${method}() called before connect — call it from onConnect()`);
    if (this.signal.aborted) throw new Error(`[auril] <${this.localName}>: ${method}() called after disconnect`);
  }

  /**
   * @overload
   * @returns {void}
   */
  /**
   * @overload
   * @param {(state: any) => void} cb
   * @returns {void}
   */
  /**
   * @template T
   * @overload
   * @param {(state: any) => T} selector
   * @param {(slice: T, state: any) => void} cb
   * @returns {void}
   */
  /**
   * watch()              — re-render (update()) on any store change
   * watch(cb)            — cb(state) on any store change
   * watch(selector, cb)  — cb(slice, state) only when the selected slice changes
   * Subscriptions are removed automatically on disconnect.
   * @param {(state: any) => any} [selectorOrCb]
   * @param {(slice: any, state: any) => void} [maybeCb]
   */
  watch(selectorOrCb, maybeCb) {
    const store = /** @type {typeof AurilElement} */ (this.constructor).store;
    if (!store) throw new Error(`[auril] <${this.localName}>: assign AurilElement.store before calling watch()`);
    this.#assertLive('watch');
    const selector = typeof maybeCb === 'function' ? selectorOrCb : null;
    const cb = (selector ? maybeCb : selectorOrCb) ?? (() => this.update());
    let prev = selector ? selector(store.state) : undefined;
    const signal = /** @type {AbortSignal} */ (this.signal);
    const unsub = store.subscribe((state) => {
      if (!selector) return cb(state, state);
      const next = selector(state);
      if (next === prev) return;
      prev = next;
      cb(next, state);
    });
    signal.addEventListener('abort', unsub, { once: true });
  }

  /**
   * Morph the live DOM to match render(). Preserves focus, selection, scroll.
   * Skipped entirely when render() output is unchanged since the last update,
   * so coarse watch() subscriptions stay cheap.
   *
   * A failing render is reported, never rethrown. The two call paths used to
   * disagree: a throw escaped connectedCallback uncaught, but on the store-driven
   * path it landed in Store's per-subscriber catch and was merely logged twice.
   * reportError() reaches window.onerror and telemetry identically from both.
   */
  update() {
    const self = /** @type {AurilElement & Hooks} */ (this);
    if (!self.render) return;
    try {
      const next = String(self.render());
      if (next === this.#lastHtml) return dev.log('update', this.localName, '(unchanged, skipped)');
      dev.log('update', this.localName);
      morph(this, next);
      this.#lastHtml = next;
    } catch (err) {
      reportError(new Error(`[auril] render failed in <${this.localName}>`, { cause: err }));
    }
  }
}
