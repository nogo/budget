#!/usr/bin/env bash
# Refused later: an entry made offline whose category is deleted elsewhere
# before it is sent. The server refuses it; it must not vanish. It stays in
# the month list with the server's reason, counts in the top bar, survives a
# reload, and leaves only when it is fixed and saved, or discarded.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
status="document.querySelector('.bar-status').innerText"
refused="document.querySelectorAll('month-list .row.refused').length"

jar="$work/cookies"
curl -sf -c "$jar" -o /dev/null "$url/auth/login"
# temp NAME: create a category on the server, answer its id.
temp() {
	curl -sf -b "$jar" -H 'Content-Type: application/json' -d "{\"name\":\"$1\",\"hasNotes\":false}" "$url/api/ledgers/household/categories" | sed -n 's/.*"id":\([0-9]*\).*/\1/p'
}
# offline_entry NAME AMOUNT: with the page offline, save a new entry in
# category NAME; it waits in the outbox.
offline_entry() {
	ab set offline on >/dev/null
	ab select '#category' "$1" >/dev/null
	ab fill '#amount' "$2" >/dev/null
	ab click '#tx-save' >/dev/null
	await "the $1 entry waits" "document.querySelectorAll('month-list .row.waiting').length === 1" "document.querySelector('month-list').innerText"
}

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
total=$(ab eval "document.querySelector('.month-total').textContent" | tr -d '"')

echo "# refused while nobody waits for it"
id=$(temp Weg1)
ab reload >/dev/null
await 'the new category is offered' "[...document.querySelectorAll('#category option')].some((o) => o.textContent === 'Weg1')"
offline_entry Weg1 5
curl -sf -b "$jar" -X DELETE -o /dev/null "$url/api/ledgers/household/categories/$id"
ab set offline off >/dev/null
await 'the entry stays, marked refused' "$refused === 1 && document.querySelectorAll('month-list .row.waiting').length === 0" "document.querySelector('month-list').innerText"
check 'with the server reason' "document.querySelector('.row.refused .refused-reason').textContent === 'Wähle eine vorhandene Kategorie.'" "document.querySelector('.row.refused')?.innerText"
check 'the top bar counts it' "$status.includes('1 abgelehnt')" "$status"
check 'the month total leaves it out' "document.querySelector('.month-total').textContent === '$total'" "document.querySelector('.month-total').textContent"
ab reload >/dev/null
await 'it survives a reload' "$refused === 1" "document.querySelector('month-list').innerText"

echo "# fix"
tap '.row.refused [data-retry]'
await 'the form takes its values and says what is wrong' "document.querySelector('#amount').value === '5' && !!document.querySelector('#tx-form .error')" "document.querySelector('#tx-form').innerText"
ab select '#category' 'Lebensmittel' >/dev/null
ab click '#tx-save' >/dev/null
await 'saved, it leaves the refused list' "$refused === 0 && !$status.includes('abgelehnt')" "[$status, document.querySelector('month-list').innerText]"
await 'and shows as a normal entry' "document.querySelectorAll('month-list .row').length === 21" "document.querySelectorAll('month-list .row').length"

echo "# discard"
id=$(temp Weg2)
ab reload >/dev/null
await 'the second category is offered' "[...document.querySelectorAll('#category option')].some((o) => o.textContent === 'Weg2')"
offline_entry Weg2 7
curl -sf -b "$jar" -X DELETE -o /dev/null "$url/api/ledgers/household/categories/$id"
ab set offline off >/dev/null
await 'refused again' "$refused === 1" "document.querySelector('month-list').innerText"
tap '.row.refused [data-arm^="discard-"]'
check 'the first tap only arms' "$refused === 1 && document.querySelector('.row.refused .armed') !== null"
ab click '.row.refused .armed' >/dev/null
await 'the second tap discards it' "$refused === 0 && !$status.includes('abgelehnt')" "$status"
ab reload >/dev/null
await 'and it stays gone' "document.querySelectorAll('month-list .row').length === 21 && $refused === 0" "document.querySelector('month-list').innerText"

exit $failed
