#!/usr/bin/env bash
# The month view: transactions grouped by day, newest day and newest entry
# first; each row's category, note and amount; the total in the bottom bar;
# stepping months; an invalid month falls back to the current one; a row
# opens in the form and stays highlighted.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
dd() { echo "${2:-$ym}" | awk -F- -v d="$1" '{ printf "%02d.%s.%s", d, $2, $1 }'; }

login
await 'the start page shows the current month' "location.pathname === '/' && $(text '.month-title') === '$ym'" "$(text '.month-title')"
await 'the list has loaded' "document.querySelectorAll('month-list .row').length === 20" "$rows"
check 'days newest first, as DD.MM.YYYY' "$days === JSON.stringify([28,26,24,22,20,18,16,15,13,12,10,9,8,6,5,4,3,2,1].map((d) => String(d).padStart(2, '0') + '.$(echo "$ym" | awk -F- '{print $2"."$1}')'))" "$days"
check 'within a day the newest entry first' "JSON.stringify([...document.querySelectorAll('month-list .row')].slice(-2).map((r) => r.querySelector('.cat').textContent)) === '[\"Bäcker\",\"Gehalt\"]'" "$rows"
check 'a row: category, note after a dash, amount' "$rows.includes('\"Unterhaltung|Konzert|25,00 €\"') && document.querySelector('#day-$ym-28 + .row .note').textContent === ' - Konzert'" "$rows"
check 'a row without note shows no dash' "!document.querySelector('#day-$ym-26 + .row .note')"
check 'amounts are right-aligned in a monospace font' "(() => { const a = document.querySelector('month-list .row .amount'); const s = getComputedStyle(a); return /mono/i.test(s.fontFamily) && a.getBoundingClientRect().right > document.querySelector('month-list .row').getBoundingClientRect().right - 20; })()"
check 'expense rows red, income rows green' "getComputedStyle(document.querySelector('month-list .row.expense')).color === 'rgb(215, 0, 9)' && getComputedStyle(document.querySelector('month-list .row.income')).color === 'rgb(0, 129, 58)'"
check 'the bottom bar shows the month total in green' "$(text '.month-total') === '2.181,80 €' && document.querySelector('.month-total').classList.contains('income')" "$(text '.month-total')"
check 'the bottom bar links the months around' "$(text '#prev-month') === '$prev' && $(text '#next-month') === '$next'"
check 'the bottom bar sticks to the bottom' "getComputedStyle(document.querySelector('.month-bar')).position === 'sticky'"

ab click '#prev-month' >/dev/null
await 'the previous month opens' "$listed && location.pathname === '/$prev' && $(text '.month-title') === '$prev' && document.querySelectorAll('month-list .row').length === 20" "[location.pathname, $(text '.month-title')]"
check 'its days are in that month' "JSON.parse($days)[0] === '$(dd 28 "$prev")'" "$days"
ab click '#next-month' >/dev/null
await 'the next month returns to this one' "$listed && location.pathname === '/$ym' && $(text '.month-title') === '$ym'"
ab click '#next-month' >/dev/null
await 'a month without entries' "$listed && location.pathname === '/$next' && document.querySelectorAll('month-list .row').length === 0 && !!document.querySelector('month-list .empty')" "[location.pathname, document.querySelector('month-list').innerText]"
check 'a zero total is hidden' "$(text '.month-total') === ''"

goto /2025-13
await 'an invalid month falls back to the current one' "$(text '.month-title') === '$ym'"
goto /nonsense
await 'any other path shows the current month' "$(text '.month-title') === '$ym' && document.querySelectorAll('month-list .row').length === 20"

goto "/$ym"
await 'the list has loaded again' "document.querySelectorAll('month-list .row').length === 20"
id=$(value "document.querySelector('#day-$ym-28 + .row').id.slice(3)")
ab click "#tx-$id" >/dev/null
await 'a row opens in the form' "location.pathname === '/$ym/$id' && document.querySelector('#amount')?.value === '25' && document.querySelector('#category option:checked')?.textContent === 'Unterhaltung' && document.querySelector('#note')?.value === 'Konzert' && document.querySelector('#date').value === '$ym-28'" "[location.pathname, document.querySelector('transaction-form').innerText]"
check 'the row stays highlighted' "document.querySelector('#tx-$id').classList.contains('selected') && document.querySelector('#tx-$id').getAttribute('aria-current') === 'true' && getComputedStyle(document.querySelector('#tx-$id')).backgroundColor === 'rgb(243, 244, 246)'"
ab reload >/dev/null
await 'an open row survives a reload' "document.querySelector('#amount')?.value === '25' && document.querySelector('#tx-$id')?.classList.contains('selected')"
exit $failed
