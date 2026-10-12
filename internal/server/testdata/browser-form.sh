#!/usr/bin/env bash
# The transaction form for a new entry: fields in order, arithmetic in the
# amount, the amount must be above zero, the note only for categories with
# notes, template buttons that fill the form, the default date and type,
# and saving through the outbox.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
last=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%Y-%m-%d)
form="document.querySelector('transaction-form')"
labels="JSON.stringify([...document.querySelectorAll('#tx-form label, #tx-form .template-chips')].map((l) => l.matches('.template-chips') ? 'templates' : l.textContent.trim()))"
chips="JSON.stringify([...document.querySelectorAll('#tx-form [data-template]')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim() + (b.classList.contains('income') ? '+' : '-')))"
pick() { ab select '#category' "$1" >/dev/null; }
# setdate DAY: what picking DAY in the date input does.
setdate() { ab eval "(() => { const d = document.querySelector('#date'); d.value = '$1'; d.dispatchEvent(new Event('input', { bubbles: true })); return true; })()" >/dev/null; }

login
await 'the form has loaded' "!!document.querySelector('#amount') && document.querySelectorAll('#category option').length === 6" "$form.innerHTML"
check 'fields in order: amount, category, date, type' "$labels === JSON.stringify(['Betrag', 'Kategorie', 'Datum', 'Ausgabe', 'Einnahme'])" "$labels"
check 'the first category is preselected' "document.querySelector('#category').value === '1' && document.querySelector('#category option:checked').textContent === 'Bäcker'"
check 'categories in the order they were created' "JSON.stringify([...document.querySelectorAll('#category option')].map((o) => o.textContent)) === JSON.stringify(['Bäcker', 'Lebensmittel', 'Mittag', 'Unterhaltung', 'Fahrtkosten', 'Gehalt'])"
check 'expense is preselected' "document.querySelector('#tx-expense').checked && !document.querySelector('#tx-income').checked"
check "the date is today's day in the shown month" "document.querySelector('#date').value === '$ym-$today'" "document.querySelector('#date').value"
check 'no note field for a category without notes' "!document.querySelector('#note')"
check 'one full-width save button' "document.querySelectorAll('#tx-form button[type=submit]').length === 1 && !document.querySelector('#tx-delete') && Math.abs(document.querySelector('#tx-save').offsetWidth - document.querySelector('#amount').offsetWidth) < 2" "[document.querySelector('#tx-save').offsetWidth, document.querySelector('#amount').offsetWidth]"

ab click '#amount' >/dev/null
check 'the amount selects its content on focus' "document.activeElement.id === 'amount' && document.activeElement.selectionStart === 0 && document.activeElement.selectionEnd === 1" "[document.activeElement.id, document.activeElement.selectionStart, document.activeElement.selectionEnd]"
ab keyboard type '12+4,50abc€' >/dev/null
await 'only digits and + - * / ( ) , . can be typed' "document.querySelector('#amount').value === '12+4,50'" "document.querySelector('#amount').value"
check '12+4,50 shows = 16.5 beside the field' "$(text '.calc') === '= 16.5'" "$(text '.calc')"

ab fill '#amount' '0' >/dev/null
ab click '#tx-save' >/dev/null
await 'an amount of zero is refused below the field' "$(text '#amount-error') === 'Betrag muss größer als 0 sein' && document.querySelector('#amount').getAttribute('aria-invalid') === 'true'" "$form.innerText"
ab fill '#amount' '3-5' >/dev/null
ab click '#tx-save' >/dev/null
await 'a negative result is refused too' "$(text '#amount-error') === 'Betrag muss größer als 0 sein'"

pick 'Unterhaltung'
await 'the note field appears for a category with notes' "!!document.querySelector('#note')" "$form.innerHTML"
check 'note and templates come between category and date' "$labels === JSON.stringify(['Betrag', 'Kategorie', 'Notiz', 'templates', 'Datum', 'Ausgabe', 'Einnahme'])" "$labels"
check "the category's templates show as buttons, coloured by type" "$chips === JSON.stringify(['Streaming-', 'Monatsende-'])" "$chips"
pick 'Gehalt'
await 'a template without note shows (day.) amount' "$chips === JSON.stringify(['(1.) 2.500,00 €+'])" "$chips"
check 'the note hides again' "!document.querySelector('#note')"
pick 'Mittag'
await 'a template of zero shows its note' "$chips === JSON.stringify(['Kantine-'])" "$chips"
ab fill '#amount' '7,20' >/dev/null
ab click '#use-template-3' >/dev/null
await 'a template without amount keeps the amount and sets the day' "document.querySelector('#amount').value === '7,20' && document.querySelector('#date').value === '$ym-15'" "[document.querySelector('#amount').value, document.querySelector('#date').value]"

pick 'Unterhaltung'
await 'Unterhaltung templates' "!!document.querySelector('#use-template-5')"
ab click '#use-template-5' >/dev/null
await 'a template fills amount, note, type and day' "document.querySelector('#amount').value === '9.5' && document.querySelector('#note').value === 'Monatsende' && document.querySelector('#tx-expense').checked" "[document.querySelector('#amount').value, document.querySelector('#note')?.value]"
check "day 31 becomes the month's last day" "document.querySelector('#date').value === '$last'" "document.querySelector('#date').value"
pick 'Gehalt'
ab click '#use-template-1' >/dev/null
await 'an income template switches the type' "document.querySelector('#tx-income').checked && document.querySelector('#amount').value === '2500' && document.querySelector('#date').value === '$ym-01'"

pick 'Unterhaltung'
ab click '#tx-expense' >/dev/null
ab fill '#amount' '12+4,50' >/dev/null
ab fill '#note' 'Zirkus' >/dev/null
setdate "$ym-07"
ab click '#tx-save' >/dev/null
await 'saving puts the entry in the list' "$rows.includes('\"Unterhaltung|Zirkus|16,50 €\"') && document.querySelector('#day-$ym-07 + .row .cat')?.textContent === 'Unterhaltung'" "$rows"
await 'and resets the form' "document.querySelector('#amount').value === '0' && document.querySelector('#category').value === '1' && !document.querySelector('#note') && document.querySelector('#date').value === '$ym-$today' && document.querySelector('#tx-expense').checked" "$form.innerText"
check 'nothing waits in the outbox' "document.querySelectorAll('.row.waiting').length === 0 && !document.querySelector('.waiting-count')"
check 'the month total counts it' "$(text '.month-total') === '2.165,30 €'" "$(text '.month-total')"

ab click '#prev-month' >/dev/null
await "in another month the date is today's day there" "document.querySelector('#date').value === '$prev-$today'" "document.querySelector('#date').value"
exit $failed
