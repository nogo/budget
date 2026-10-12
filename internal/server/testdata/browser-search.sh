#!/usr/bin/env bash
# Search above the month list: words search the note in every month, #name
# filters by category and =amount by amount inside the shown month; the
# count of results shows; the search stays in the address, survives opening
# a transaction, and the clear button removes it.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
months="JSON.stringify([...new Set([...document.querySelectorAll('month-list .day')].map((h) => h.textContent.slice(3)))].sort())"
mm() { echo "$1" | awk -F- '{ print $2"."$1 }'; }
search() {
	ab fill '#q' "$1" >/dev/null
	ab press Enter >/dev/null
}

login
await 'the list has loaded' "document.querySelectorAll('month-list .row').length === 20"
check 'the search field explains the syntax' "document.querySelector('#q').placeholder.includes('#Kategorie') && document.querySelector('#q').placeholder.includes('=Betrag')"
check 'it has a clear and a submit button' "!!document.querySelector('#search-clear') && !!document.querySelector('#search button[type=submit]')"
check 'no result count without a search' "!document.querySelector('.result-count')"

search 'bäcker'
await '"bäcker" searches the notes of every month' "location.search === '?q=b%C3%A4cker' && $rows === JSON.stringify(['Bäcker|Kuchen vom Bäcker|5,50 €', 'Bäcker|Kuchen vom Bäcker|5,50 €', 'Bäcker|Bäckerei Sonntag|6,40 €', 'Bäcker|Bäckerei Sonntag|6,40 €'])" "[location.search, $rows]"
check 'results come from four months' "$months === JSON.stringify(['11.$((year - 2))', '11.$((year - 1))', '$(mm "$prev")', '$(mm "$ym")'].sort())" "$months"
check 'the number of results shows' "$(text '.result-count') === '4 Transaktionen gefunden'" "$(text '.result-count')"

search '#leb'
await '"#leb" finds Lebensmittel in the shown month only' "location.search === '?q=%23leb' && document.querySelectorAll('month-list .row').length === 6 && [...document.querySelectorAll('month-list .row .cat')].every((c) => c.textContent === 'Lebensmittel')" "$rows"
check 'all of them in this month' "$months === JSON.stringify(['$(mm "$ym")'])" "$months"
check 'the count says 6' "$(text '.result-count') === '6 Transaktionen gefunden'"

search 'kuchen #leb'
await '"kuchen #leb" searches every month' "$rows === JSON.stringify(['Lebensmittel|Kuchen|12,99 €', 'Lebensmittel|Kuchen|12,99 €', 'Lebensmittel|Kuchen|44,10 €', 'Lebensmittel|Kuchen|44,10 €'])" "$rows"

search '=12,99'
await '"=12,99" finds the amount in the shown month' "$rows === JSON.stringify(['Unterhaltung|Streaming|12,99 €', 'Lebensmittel|Kuchen|12,99 €'])" "$rows"
search '#unt =12.99'
await '"#unt =12.99" combines both' "$rows === JSON.stringify(['Unterhaltung|Streaming|12,99 €'])" "$rows"
check 'one result says so' "$(text '.result-count') === '1 Transaktion gefunden'"
search '#unt #fahr'
await 'several # terms are "any of"' "document.querySelectorAll('month-list .row').length === 5" "$rows"

search 'kuchen'
await 'a word search' "document.querySelectorAll('month-list .row').length === 6" "$rows"
id=$(value "document.querySelector('month-list .row').id.slice(3)")
ab click "#tx-$id" >/dev/null
await 'opening a result keeps the search in the address' "location.pathname === '/$ym/$id' && location.search === '?q=kuchen' && document.querySelector('#q').value === 'kuchen' && document.querySelectorAll('month-list .row').length === 6" "[location.href, document.querySelector('#q').value]"
check 'the open row is highlighted among the results' "document.querySelector('#tx-$id').classList.contains('selected')"
ab reload >/dev/null
await 'the search survives a reload' "document.querySelector('#q').value === 'kuchen' && document.querySelectorAll('month-list .row').length === 6"

ab click '#search-clear' >/dev/null
await 'the clear button removes the search' "location.search === '' && document.querySelector('#q').value === '' && document.querySelectorAll('month-list .row').length === 20 && !document.querySelector('.result-count')" "[location.href, document.querySelectorAll('month-list .row').length]"
exit $failed
