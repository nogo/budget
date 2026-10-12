#!/usr/bin/env bash
# Review: the period navigation (all years, year, month) with four headline
# numbers against the year before; years oldest first with sums and a bar
# chart whose accumulated line is a checkbox away; the category filter
# (dropdown, chips, clear) stays in the address and carries to the year
# pages; a year per month with links to the month review and the month's
# list; a month's expenses as sorted bars; the heatmap of categories over
# months or years; the table folded.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
table="JSON.stringify([...document.querySelectorAll('review-table tbody tr, review-table tfoot tr')].map((r) => [...r.cells].map((c) => c.textContent.replace(/\\s+/g, ' ').trim()).filter(Boolean).join('|')))"
heads="JSON.stringify([...document.querySelectorAll('review-table thead th')].map((c) => c.textContent.replace(/ \\(.\\)$/, '').trim()).filter(Boolean))"
y1=$((year - 1)); y2=$((year - 2))
m=$((10#$(date +%m))); pm=$((10#$(date -d "$prev-01" +%m)))

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
ab click '.bar-end a[href="/review"]' >/dev/null
await 'the top bar opens /review' "location.pathname === '/review' && document.querySelectorAll('review-table tbody tr').length === 3" "document.body.innerText.slice(0, 400)"
check 'the top bar titles it' "$(text '.page-title') === 'Auswertung'"
check 'the navigation marks all years' "document.querySelector('#period-all').getAttribute('aria-current') === 'page' && document.querySelector('#period-year').getAttribute('href') === '/review/$year' && !document.querySelector('#review-prev')"
check 'the table is folded' "document.querySelector('review-table details').open === false && $(text 'review-table summary') === 'Tabelle'"
await 'four boxes, no comparison for all years' "$(text '#box-saved .box-label') === 'Gespart' && $(text '#box-income .box-note') === '' && $(text '#box-income .box-value') === document.querySelector('review-table tfoot td').textContent.replace(/\\s+/g, ' ').trim()" "[$(text '#box-income .box-value'), document.querySelector('review-table tfoot td')?.textContent]"
await 'a heatmap of categories by year' "document.querySelectorAll('review-heatmap .heat-row').length > 1 && [...document.querySelectorAll('review-heatmap .heat-col')].map((c) => c.textContent).join() === '${y2:2},${y1:2},${year:2}'" "[...document.querySelectorAll('review-heatmap .heat-col')].map((c) => c.textContent)"
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
check 'the boxes sum only the chosen category' "$(text '#box-income .box-value') === '0,00 €' && $(text '#box-expense .box-value') === document.querySelector('review-table tfoot td:nth-child(3)').textContent.replace(/\\s+/g, ' ').trim()" "[$(text '#box-expense .box-value'), document.querySelector('review-table tfoot td:nth-child(3)')?.textContent]"
check 'the heatmap shows only the chosen category' "[...document.querySelectorAll('review-heatmap .heat-row:not(.heat-head) .heat-name')].map((n) => n.textContent).join() === 'Lebensmittel'" "[...document.querySelectorAll('review-heatmap .heat-name')].map((n) => n.textContent)"
check 'the chosen category leaves the dropdown' "![...document.querySelectorAll('#filter-add option')].some((o) => o.textContent === 'Lebensmittel')"
await 'with only expenses there is nothing to accumulate' "!document.querySelector('#accumulated') && document.querySelectorAll('review-chart rect').length === 6"
ab select '#filter-add' 'Gehalt' >/dev/null
await 'a second category adds a chip' "location.search === '?categories=2,6' && document.querySelectorAll('.chip').length === 2 && !!document.querySelector('#filter-clear')" "location.search"
ab click '.chip-remove[data-remove="2"]' >/dev/null
await 'a chip removes its category' "location.search === '?categories=6' && document.querySelectorAll('.chip').length === 1"
ab select '#filter-add' 'Bäcker' >/dev/null
await 'two again' "location.search === '?categories=6,1'"
ab click 'review-table summary' >/dev/null
await 'a click unfolds the table' "document.querySelector('review-table details').open === true"
ab click "#review-year-$y1 a" >/dev/null
await 'the filter carries over to the year page' "location.pathname === '/review/$y1' && location.search === '?categories=6,1' && document.querySelectorAll('.chip').length === 2" "[location.href, document.querySelectorAll('.chip').length]"
await 'the year page shows its months, January first' "$table === JSON.stringify(['3|2.300,00 €|3,80 €|2.296,20 €', '11|80,00 €|6,40 €|73,60 €', 'Summe|2.380,00 €|10,20 €|2.369,80 €'])" "$table"
ab click '#filter-clear' >/dev/null
await '"Filter löschen" clears it' "location.pathname === '/review/$y1' && location.search === '' && document.querySelectorAll('.chip').length === 0" "location.href"

goto "/review/$year"
await 'a year page' "$(text 'review-period h2') === '$year' && document.querySelectorAll('review-table tbody tr').length >= 1"
await 'the heatmap shows the twelve months' "document.querySelectorAll('review-heatmap .heat-head .heat-col').length === 12 && document.querySelector('review-heatmap .heat-row:not(.heat-head) a.heat').getAttribute('href').startsWith('/$year-01?q=%23')" "document.querySelector('review-heatmap')?.innerHTML.slice(0, 300)"
check 'columns: month, income, expense, total' "$heads.startsWith(JSON.stringify(['Monat', 'Einnahmen', 'Ausgaben', 'Summe']).slice(0, -1))" "$heads"
check 'previous and next year buttons' "document.querySelector('#review-prev').getAttribute('href') === '/review/$y1' && document.querySelector('#review-prev').getAttribute('aria-label') === 'Zurück zu $y1' && document.querySelector('#review-next').getAttribute('aria-label') === 'Weiter zu $((year + 1))'"
check 'each month links to its review and its list' "document.querySelector('#review-month-$m a').getAttribute('href') === '/review/$year/$m' && document.querySelector('#review-month-$m a[href=\"/$ym\"]') !== null" "document.querySelector('#review-month-$m')?.innerHTML"
check 'the month row sums' "$table.includes('\"$m|2.620,00 €|438,20 €|2.181,80 €\"')" "$table"
ab click '#review-prev' >/dev/null
await 'previous year' "location.pathname === '/review/$y1' && $(text 'review-period h2') === '$y1'"
await 'its boxes compare with the year before' "$(text '#box-income .box-note') === '▲ 0 % ggü. $y2' && $(text '#box-saved .box-note') === '$y2: 2.188,85 €'" "[$(text '#box-income .box-note'), $(text '#box-saved .box-note')]"
goto "/review/$year"
await 'back to this year' "!!document.querySelector('#review-month-$m')"
ab click 'review-table summary' >/dev/null
ab click "#review-month-$m a[href=\"/$ym\"]" >/dev/null
await "the list button opens the month's transactions" "location.pathname === '/$ym' && document.querySelectorAll('month-list .row').length === 20"

goto "/review/$year"
await 'year again' "!!document.querySelector('#review-month-$m')"
ab click 'review-table summary' >/dev/null
ab click "#review-month-$m a" >/dev/null
await 'the month button opens the month review' "location.pathname === '/review/$year/$m' && $(text 'review-period h2') === '$ym'" "location.pathname"
await 'one row per category with sums' "$heads === JSON.stringify(['Kategorie', 'Einnahmen', 'Ausgaben', 'Summe']) && $table === JSON.stringify(['Bäcker|0,00 €|15,40 €|-15,40 €', 'Lebensmittel|0,00 €|267,51 €|-267,51 €', 'Mittag|0,00 €|29,80 €|-29,80 €', 'Unterhaltung|0,00 €|52,99 €|-52,99 €', 'Fahrtkosten|0,00 €|72,50 €|-72,50 €', 'Gehalt|2.620,00 €|0,00 €|2.620,00 €', 'Summe|2.620,00 €|438,20 €|2.181,80 €'])" "[$heads, $table]"
check 'negative totals red' "document.querySelector('#review-cat-1 td:nth-child(4)').classList.contains('expense')"
check 'no bar chart and no filter on a month' "!document.querySelector('review-chart') && !document.querySelector('category-filter')"
check 'the month shows its expenses largest first' "[...document.querySelectorAll('expense-bars .xbar')].map((b) => b.querySelector('.xname').textContent).join() === 'Lebensmittel,Fahrtkosten,Unterhaltung,Mittag,Bäcker'" "[...document.querySelectorAll('expense-bars .xname')].map((b) => b.textContent)"
check 'a bar opens the month list searched by its category' "document.querySelector('#xbar-2').getAttribute('href') === '/$ym?q=%23Lebensmittel' && $(text '#xbar-2 .xamount') === '267,51 €'"
check 'the heatmap marks the open month' "document.querySelectorAll('review-heatmap .heat.open').length === document.querySelectorAll('review-heatmap .heat-row:not(.heat-head)').length && $(text 'review-heatmap .heat-col.open') !== ''"
check 'previous and next month buttons' "document.querySelector('#review-prev').getAttribute('aria-label') === 'Zurück zu $prev' && document.querySelector('#review-next').getAttribute('aria-label') === 'Weiter zu $next'"
ab click '#review-prev' >/dev/null
await 'the previous month review' "location.pathname === '/review/$(date -d "$prev-01" +%Y)/$pm' && $(text 'review-period h2') === '$prev'" "location.pathname"
exit $failed
