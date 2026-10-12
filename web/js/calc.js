// The amount field's arithmetic: + - * / and parentheses over numbers with
// a comma or a dot as decimal mark. A small parser, never eval.

// notAmount matches every character the amount field refuses.
export const notAmount = /[^0-9+\-*/().,]/g;

// evaluate returns the value of the expression, or NaN when it isn't one.
export function evaluate(text) {
  const tokens = String(text).replace(/\s+/g, '').match(/\d+(?:[.,]\d*)?|[.,]\d+|[-+*/()]|./g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = factor();
    while (peek() === '*' || peek() === '/') v = next() === '*' ? v * factor() : v / factor();
    return v;
  }
  function factor() {
    const tok = next();
    if (tok === '-') return -factor();
    if (tok === '+') return factor();
    if (tok === '(') {
      const v = expr();
      if (next() !== ')') return NaN;
      return v;
    }
    if (tok !== undefined && /^[\d.,]/.test(tok)) return Number(tok.replace(',', '.'));
    return NaN;
  }
  if (tokens.length === 0) return NaN;
  const v = expr();
  return i === tokens.length && Number.isFinite(v) ? v : NaN;
}

// amountOf is the expression's value rounded to cents; 0 when it is not a
// number or below zero, as the old form did.
export function amountOf(text) {
  const v = evaluate(text);
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
}
