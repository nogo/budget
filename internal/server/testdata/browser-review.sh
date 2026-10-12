#!/usr/bin/env bash
# Review: years oldest first with sums and a bar chart whose accumulated
# line is a checkbox away; the category filter (dropdown, chips, clear)
# stays in the address and carries to the year pages; a year per month
# with links to the month review and the month's list; a month per
# category, without a chart.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
table="JSON.stringify([...document.querySelectorAll('review-table tbody tr, review-table tfoot tr')].map((r) => [...r.cells].map((c) => c.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean).join('|')))"
heads="JSON.stringify([...document.querySelectorAll('review-table thead th')].map((c) => c.textContent.replace(/ \\(.\\)$/, '').trim()).filter(Boolean))"
y1=$((year - 1)); y2=$((year - 2))
m=$((10#$(date +%m))); pm=$((10#$(date -d "$prev-01" +%m)))

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
ab click '.bar-end a[href="/review"]' >/dev/null
await 'the top bar opens /review' "location.pathname === '/review' && document.querySelectorAll('review-table tbody tr').length === 3" "document.body.innerText.slice(0, 400)"
check 'the top bar titles it' "$(text '.page-title') === 'Auswertung'"
check 'columns: year, income, expense, total' "$heads === JSON.stringify(['Jahr', 'Einnahmen', 'Ausgaben', 'Summe'])" "$heads"
if [ "$prev" \< "$year" ]; then this="2.620,00 €|438,20 €|2.181,80 €"; else this="5.240,00 €|876,40 €|4.363,60 €"; fi
check 'one row per year, oldest first, with a footer of sums' "$table === JSON.stringify(['$y2|2.380,00 €|191,15 €|2.188,85 €', '$y1|2.380,00 €|191,15 €|2.188,85 €', '$year|$this', 'Summe|' + ($table.includes('5.240,00') ? '10.000,00 €|1.258,70 €|8.741,30 €' : '7.380,00 €|820,50 €|6.559,50 €')])" "$table"
check 'totals green when positive' "[...document.querySelectorAll('review-table td:nth-child(4)')].every((c) => c.classList.contains('income'))"
check 'the year cell is a link to that year' "document.querySelector('#review-year-$y1 a').getAttribute('href') === '/review/$y1'"
await 'a bar chart beside the table, oldest year first' "document.querySelectorAll('review-chart rect.bar-income').length === 3 && document.querySelectorAll('review-chart rect.bar-expense').length === 3 && [...document.querySelectorAll('review-chart text.tick')].slice(-3).map((t) => t.textContent).join() === '$y2,$y1,$year'" "document.querySelector('review-chart').innerHTML.slice(0, 300)"
check 'axes show whole amounts' "[...document.querySelectorAll('review-chart text.tick')].some((t) => /^[0-9.]+ €$/.test(t.textContent.replace(/\\s/g, ' ')) && t.textContent !== '0 €')" "[...document.querySelectorAll('review-chart text.tick')].map((t) => t.textContent)"
check 'no accumulated line until asked for' "!document.querySelector('review-chart polyline') && !!document.querySelector('#accumulated')"
ab click '#accumulated' >/dev/null
await 'the checkbox adds the running total' "document.querySelector('review-chart polyline')?.getAttribute('points').split(' ').length === 3 && !!document.querySelector('.legend .accumulated')"
ab click '#accumulated' >/dev/null
await 'and takes it away' "!document.querySelector('review-chart polyline')"

ab select '#filter-add' 'Lebensmittel' >/dev/null
await 'choosing a category filters and goes into the address' "location.search === '?categories=2' && JSON.stringify([...document.querySelectorAll('.chip')].map((c) => c.textContent.trim())) === '[\"Lebensmittel\"]' && $table.includes('\"$year|0,00 €|')" "[location.search, $table]"
check 'the chosen category leaves the dropdown' "![...document.querySelectorAll('#filter-add option')].some((o) => o.textContent === 'Lebensmittel')"
await 'with only expenses there is nothing to accumulate' "!document.querySelector('#accumulated') && document.querySelectorAll('review-chart rect').length === 6"
ab select '#filter-add' 'Gehalt' >/dev/null
await 'a second category adds a chip' "location.search === '?categories=2,6' && document.querySelectorAll('.chip').length === 2 && !!document.querySelector('#filter-clear')" "location.search"
ab click '.chip-remove[data-remove="2"]' >/dev/null
await 'a chip removes its category' "location.search === '?categories=6' && document.querySelectorAll('.chip').length === 1"
ab select '#filter-add' 'Bäcker' >/dev/null
await 'two again' "location.search === '?categories=6,1'"
ab click "#review-year-$y1 a" >/dev/null
await 'the filter carries over to the year page' "location.pathname === '/review/$y1' && location.search === '?categories=6,1' && document.querySelectorAll('.chip').length === 2" "[location.href, document.querySelectorAll('.chip').length]"
await 'the year page shows its months, January first' "$table === JSON.stringify(['3|2.300,00 €|3,80 €|2.296,20 €', '11|80,00 €|6,40 €|73,60 €', 'Summe|2.380,00 €|10,20 €|2.369,80 €'])" "$table"
ab click '#filter-clear' >/dev/null
await '"Filter löschen" clears it' "location.pathname === '/review/$y1' && location.search === '' && document.querySelectorAll('.chip').length === 0" "location.href"

goto "/review/$year"
await 'a year page' "$(text 'review-head h2') === '$year' && document.querySelectorAll('review-table tbody tr').length >= 1"
check 'columns: month, income, expense, total' "$heads.startsWith(JSON.stringify(['Monat', 'Einnahmen', 'Ausgaben', 'Summe']).slice(0, -1))" "$heads"
check 'previous and next year buttons' "document.querySelector('#review-prev').getAttribute('href') === '/review/$y1' && $(text '#review-prev') === '$y1' && $(text '#review-next') === '$((year + 1))'"
check 'each month links to its review and its list' "document.querySelector('#review-month-$m a').getAttribute('href') === '/review/$year/$m' && document.querySelector('#review-month-$m a[href=\"/$ym\"]') !== null" "document.querySelector('#review-month-$m')?.innerHTML"
check 'the month row sums' "$table.includes('\"$m|2.620,00 €|438,20 €|2.181,80 €\"')" "$table"
ab click '#review-prev' >/dev/null
await 'previous year' "location.pathname === '/review/$y1' && $(text 'review-head h2') === '$y1'"
goto "/review/$year"
await 'back to this year' "!!document.querySelector('#review-month-$m')"
ab click "#review-month-$m a[href=\"/$ym\"]" >/dev/null
await "the list button opens the month's transactions" "location.pathname === '/$ym' && document.querySelectorAll('month-list .row').length === 20"

goto "/review/$year"
await 'year again' "!!document.querySelector('#review-month-$m')"
ab click "#review-month-$m a" >/dev/null
await 'the month button opens the month review' "location.pathname === '/review/$year/$m' && $(text 'review-head h2') === '$ym'" "location.pathname"
await 'one row per category with sums' "$heads === JSON.stringify(['Kategorie', 'Einnahmen', 'Ausgaben', 'Summe']) && $table === JSON.stringify(['Bäcker|0,00 €|15,40 €|-15,40 €', 'Lebensmittel|0,00 €|267,51 €|-267,51 €', 'Mittag|0,00 €|29,80 €|-29,80 €', 'Unterhaltung|0,00 €|52,99 €|-52,99 €', 'Fahrtkosten|0,00 €|72,50 €|-72,50 €', 'Gehalt|2.620,00 €|0,00 €|2.620,00 €', 'Summe|2.620,00 €|438,20 €|2.181,80 €'])" "[$heads, $table]"
check 'negative totals red' "document.querySelector('#review-cat-1 td:nth-child(4)').classList.contains('expense')"
check 'no chart and no filter on a month' "document.querySelector('review-chart').childElementCount === 0 && document.querySelector('category-filter').childElementCount === 0"
check 'previous and next month buttons' "$(text '#review-prev') === '$prev' && $(text '#review-next') === '$next'"
ab click '#review-prev' >/dev/null
await 'the previous month review' "location.pathname === '/review/$(date -d "$prev-01" +%Y)/$pm' && $(text 'review-head h2') === '$prev'" "location.pathname"
exit $failed
