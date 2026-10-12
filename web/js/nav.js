// The browser routes (docs/api.md "Browser routes") and the links between
// them. A route only sets store.route and loads its data; the app shell
// picks the screen from it.
import { Router } from '../auril/index.js';
import { store } from './state.js';
import { refresh } from './data.js';
import { currentYm, validYm } from './calendar.js';

let router;

const categoryIds = (url) => (url.searchParams.get('categories') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);

function show(route) {
  store.set({ route });
  refresh();
}

function month(params, url) {
  const ym = validYm(params.ym) ?? currentYm();
  show({ name: 'month', ym, id: params.id, q: url.searchParams.get('q') ?? '' });
}

export function startRouter() {
  router = new Router({ viewTransitions: false })
    .route('/', (_, url) => month({}, url))
    .route('/ledgers', () => show({ name: 'ledgers' }))
    .route('/templates', () => show({ name: 'templates' }))
    .route('/templates/:id(\\d+)', ({ id }) => show({ name: 'templates', id }))
    .route('/categories', () => show({ name: 'categories' }))
    .route('/categories/:id(\\d+)', ({ id }) => show({ name: 'categories', id }))
    .route('/review', (_, url) => show({ name: 'review', categories: categoryIds(url) }))
    .route('/review/:year(\\d{4})', ({ year }, url) => show({ name: 'review', year: Number(year), categories: categoryIds(url) }))
    .route('/review/:year(\\d{4})/:month(\\d{1,2})', ({ year, month: m }, url) => {
      const mm = Number(m);
      if (mm < 1 || mm > 12) return show({ name: 'review', year: Number(year), categories: categoryIds(url) });
      show({ name: 'review', year: Number(year), month: mm, categories: categoryIds(url) });
    })
    .route('/:ym(\\d{4}-\\d{2})/:id(\\d+)', month)
    .route('/:ym', month) // any other single segment: a month, or the current one
    .start();
}

// go navigates inside the app; replace keeps the history entry.
export function go(path, options) {
  router.go(path, options);
}

// withQuery appends ?name=value when value is not empty.
export function withQuery(path, name, value) {
  return value ? `${path}?${name}=${encodeURIComponent(value)}` : path;
}
