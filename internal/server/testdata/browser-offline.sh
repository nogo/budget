#!/usr/bin/env bash
# Offline: a new entry waits in the outbox, the list marks it waiting, the
# top bar says offline and counts it; when the connection returns it is
# sent once. The form keeps working offline from the kept categories and
# templates. An entry the server refuses while the form submits it leaves
# the outbox (browser-refused.sh covers a refusal later); the same key sent
# twice saves once.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
status="document.querySelector('.bar-status').innerText"

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
check 'online: no offline note' "$status.trim() === ''" "$status"
check 'categories and templates are kept for offline use' "JSON.parse(localStorage.getItem('budget.categories.household')).length === 6 && JSON.parse(localStorage.getItem('budget.templates.household')).length === 5"

await 'the service worker keeps the app shell' "!!navigator.serviceWorker.controller"
ab set offline on >/dev/null
await 'the top bar says offline' "$status.includes('offline')" "$status"
ab select '#category' 'Unterhaltung' >/dev/null
await 'the form still has its templates' "!!document.querySelector('#use-template-4')"
ab click '#use-template-4' >/dev/null
ab click '#tx-save' >/dev/null
await 'the entry waits in the list, marked' "document.querySelectorAll('month-list .row.waiting').length === 1 && document.querySelector('month-list .row.waiting').innerText.replace(/\\s+/g, ' ').trim() === 'Unterhaltung - Streaming wartet 12,99 €'" "document.querySelector('month-list .row.waiting')?.innerText"
check 'under its day' "document.querySelector('#day-$ym-13 + .row').classList.contains('waiting')"
check 'the top bar counts one waiting' "$status.includes('1 wartend')" "$status"
check 'the form is ready for the next' "document.querySelector('#amount').value === '0'"
ab fill '#amount' '2' >/dev/null
ab click '#tx-save' >/dev/null
await 'two waiting' "$status.includes('2 wartend') && document.querySelectorAll('month-list .row.waiting').length === 2" "$status"
check 'the total counts waiting entries' "$(text '.month-total') === '2.166,81 €'" "$(text '.month-total')"
ab reload >/dev/null
await 'the app opens without a connection' "!!document.querySelector('month-view #amount') && $status.includes('offline')" "document.body.innerText.slice(0, 200)"
await 'waiting entries survive it' "$status.includes('2 wartend') && document.querySelectorAll('month-list .row.waiting').length === 2" "[$status, document.querySelector('month-list').innerText]"
check 'the form works from the kept categories' "document.querySelectorAll('#category option').length === 6"
ab click '#tx-save' >/dev/null
ab click '#prev-month' >/dev/null
await 'another month offline says the list waits for the connection' "location.pathname === '/$prev' && $(text 'month-list .empty') === 'Offline: Die Liste lädt, sobald die Verbindung zurück ist.'" "document.querySelector('month-list').innerText"
ab click '#next-month' >/dev/null

ab set offline off >/dev/null
await 'back online the entries are sent' "!$status.includes('wartend') && !$status.includes('offline') && document.querySelectorAll('month-list .row.waiting').length === 0" "$status"
await 'and show in the list as saved' "document.querySelectorAll('month-list .row').length === 22 && [...document.querySelectorAll('month-list .row')].filter((r) => r.innerText.includes('Streaming')).length === 2" "$rows"
ab reload >/dev/null
await 'each was saved once' "document.querySelectorAll('month-list .row').length === 22" "$rows"

check 'the same key twice saves once' "(async () => { const body = JSON.stringify({ key: 'browser-check-0001', amount: 1, type: 'expense', categoryId: 1, date: '$ym-11', note: '' }); const post = () => fetch('/api/ledgers/household/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }); const a = await post(); const b = await post(); return a.status === 201 && b.status === 200 && (await a.json()).id === (await b.json()).id; })()"
check 'an entry the server refuses leaves the outbox with its reason' "(async () => { const o = await import('/js/outbox.js'); const out = await o.submit('household', { key: 'browser-check-0002', amount: 1, type: 'expense', categoryId: 999, date: '$ym-11', note: '' }); await new Promise((r) => setTimeout(r, 100)); return out.error?.status >= 400 && out.error.status < 500 && document.querySelector('.waiting-count') === null; })()"
exit $failed
