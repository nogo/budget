#!/usr/bin/env bash
# Layout and keyboard: on a desktop the form is a sticky fifth beside the
# list; on a phone it stacks above; nothing scrolls sideways at 320 px; the
# top bar shows icons only on phones but every link keeps its name; every
# control is reached with Tab and shows its focus.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
box() { echo "document.querySelector('$1').getBoundingClientRect()"; }

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
check 'desktop: the form column is a fifth, left of the list' "(() => { const f = $(box .form-col), l = $(box .list-col); return Math.abs(f.width / innerWidth - 0.2) < 0.03 && f.right <= l.left && Math.abs(f.top - l.top) < 2; })()" "[$(box .form-col).width, innerWidth]"
check 'desktop: the form column is sticky' "getComputedStyle(document.querySelector('.form-col')).position === 'sticky'"
check 'desktop: the top bar shows icon and text' "[...document.querySelectorAll('.bar-label')].every((l) => l.getBoundingClientRect().width > 20)"
check 'the top bar is fixed and brown' "getComputedStyle(document.querySelector('.topbar')).position === 'fixed' && getComputedStyle(document.querySelector('.topbar')).backgroundColor === 'rgb(115, 62, 10)'"

ab set viewport 390 844 >/dev/null
await 'phone: the form stacks above the list' "$(box .form-col).bottom <= $(box .list-col).top && $(box .form-col).width > 300"
check 'phone: icons only, the names stay for screen readers' "[...document.querySelectorAll('.bar-label')].every((l) => l.getBoundingClientRect().width <= 1 && l.textContent.length > 0)"
check 'phone: the word "Budget" is hidden' "getComputedStyle(document.querySelector('.brand-word')).display === 'none' && document.querySelector('.brand').getAttribute('aria-label') !== null"

ab set viewport 320 700 >/dev/null
for path in "/$ym" /templates /categories /review "/review/$year" "/review/$year/$((10#$(date +%m)))" /ledgers; do
	goto "$path"
	sleep 0.3
	check "320 px: $path does not scroll sideways" "document.documentElement.scrollWidth <= innerWidth" "[document.documentElement.scrollWidth, [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 3).map((e) => e.tagName + '.' + e.className)]"
done

ab set viewport 1280 900 >/dev/null
goto "/$ym"
await 'desktop again' "document.querySelectorAll('month-list .row').length === 20"
ab eval "document.activeElement.blur(); true" >/dev/null
order=""
last=""
for _ in $(seq 19); do
	ab press Tab >/dev/null
	# The date input holds day, month, year and its picker: one stop here.
	now="$(value "document.activeElement.id === 'date' ? 'date' : (document.activeElement.getAttribute('href') || document.activeElement.id || document.activeElement.className.split(' ')[0]) + (document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement).outlineStyle !== 'none' ? '' : '!')")"
	[ "$now" = "$last" ] || order+="$now,"
	last=$now
done
if [[ "$order" == "/,/categories,/templates,/review,logout,amount,category,date,tx-expense,tx-save,q,search-clear,button,/$ym/"* ]]; then pass 'Tab walks top bar, form, search and rows, each with a visible focus'; else fail "Tab order ($order)"; fi
id=$(value "document.querySelector('month-list .row').id.slice(3)")
ab focus "#tx-$id" >/dev/null
ab press Enter >/dev/null
await 'Enter on a row opens it' "location.pathname === '/$ym/$id' && !!document.querySelector('#tx-delete')"
ab focus '#tx-delete' >/dev/null
ab press Enter >/dev/null
await 'Enter arms delete' "$(text '#tx-delete') === 'Sicher?'"
ab press Escape >/dev/null
await 'Escape disarms it' "document.querySelector('#tx-delete').getAttribute('aria-label') === 'Löschen'"
exit $failed
