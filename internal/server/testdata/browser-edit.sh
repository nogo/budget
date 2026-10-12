#!/usr/bin/env bash
# An open transaction: save a change, save it as a template, and delete it
# with two taps on the same button ("Sicher?"), which falls back after a
# few seconds, on Escape and when focus leaves.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
form="document.querySelector('transaction-form')"
del="document.querySelector('#tx-delete')"
open_row() {
	local id
	id=$(value "document.querySelector('#day-$ym-$1 + .row').id.slice(3)")
	tap "#tx-$id"
	echo "$id"
}

login
await 'the list has loaded' "document.querySelectorAll('month-list .row').length === 20"
id=$(open_row 16)
await 'the row opens in the form' "location.pathname === '/$ym/$id' && document.querySelector('#amount')?.value === '23.5' && document.querySelector('#note')?.value === 'Tanken'" "$form.innerText"
check 'editing shows delete, save as template and save' "!!$del && $del.classList.contains('danger') && !!$del.querySelector('svg') && $del.getAttribute('aria-label') === 'Löschen' && !!document.querySelector('#tx-template') && !!document.querySelector('#tx-save')" "$form.innerHTML"
check 'no template buttons while editing' "!document.querySelector('[data-template]')"

ab fill '#amount' '20+5' >/dev/null
ab fill '#note' 'Tanken voll' >/dev/null
ab click '#tx-save' >/dev/null
await 'saving returns to the month with the change' "location.pathname === '/$ym' && $rows.includes('\"Fahrtkosten|Tanken voll|25,00 €\"')" "[location.pathname, $rows]"
await 'the form is new again' "document.querySelector('#amount').value === '0' && !document.querySelector('#tx-delete')"

open_row 13 >/dev/null
await 'Streaming opens' "document.querySelector('#note')?.value === 'Streaming'"
ab click '#tx-template' >/dev/null
await 'save as template confirms in place' "$(text '.saved-note') === 'Vorlage gespeichert'" "$form.innerText"
goto /templates
await 'the template copies category, note, amount, type and day' "[...document.querySelectorAll('template-list .row')].filter((r) => r.innerText.replace(/\\s+/g, ' ').includes('13. Streaming 12,99 €')).length === 2" "document.querySelector('template-list').innerText"

goto "/$ym"
await 'the list has loaded again' "document.querySelectorAll('month-list .row').length === 20"
id=$(open_row 18)
await 'Mittag opens' "location.pathname === '/$ym/$id' && document.querySelector('#amount')?.value === '11.4'"
ab click '#tx-delete' >/dev/null
await 'the first tap turns delete into "Sicher?"' "$del.textContent === 'Sicher?' && $del.getAttribute('aria-label') === 'Sicher?'" "$del.outerHTML"
check 'nothing is deleted yet' "location.pathname === '/$ym/$id' && !!document.querySelector('#tx-$id')"
sleep 3.3
check 'it falls back after a few seconds' "$del.textContent === '' && $del.getAttribute('aria-label') === 'Löschen'" "$del.outerHTML"
ab click '#tx-delete' >/dev/null
await 'armed again' "$del.textContent === 'Sicher?'"
ab press Escape >/dev/null
await 'Escape disarms' "$del.getAttribute('aria-label') === 'Löschen'" "$del.outerHTML"
ab click '#tx-delete' >/dev/null
await 'armed once more' "$del.textContent === 'Sicher?'"
ab focus '#tx-save' >/dev/null
await 'leaving focus disarms' "$del.getAttribute('aria-label') === 'Löschen'" "$del.outerHTML"
ab click '#tx-delete' >/dev/null
ab click '#tx-delete' >/dev/null
await 'the second tap deletes and returns to the month' "location.pathname === '/$ym' && !document.querySelector('#tx-$id') && document.querySelectorAll('month-list .row').length === 19" "[location.pathname, $rows]"
check 'the total follows' "$(text '.month-total') === '2.191,70 €'" "$(text '.month-total')"

goto "/$ym/999999"
await 'an unknown transaction says so' "$(text 'transaction-form .empty') === 'Nicht gefunden.'" "$form.innerText"
exit $failed
