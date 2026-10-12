#!/usr/bin/env bash
# One language per instance: an English instance shows English words,
# en-US numbers and dates, and the session's currency, whatever the
# browser's language.
export BUDGET_FIXTURE_LANG=en
source "$(dirname "$0")/lib-browser.sh"
mdy() { echo "$1" | awk -F- '{ printf "%s/%s/%s", $2, $3, $1 }'; }

login
await 'the ledger choice speaks English' "$(text 'ledger-choice h1') === 'Choose a ledger' && document.documentElement.lang === 'en'" "document.body.innerText"
ab click '#ledger-household' >/dev/null
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
check 'the top bar in English' "JSON.stringify([...document.querySelectorAll('.bar-end .bar-link')].map((a) => a.textContent.trim())) === '[\"Categories\",\"Templates\",\"Review\",\"Logout\"]'"
check 'the form in English' "JSON.stringify([...document.querySelectorAll('#tx-form label')].map((l) => l.textContent.trim())) === JSON.stringify(['Amount', 'Category', 'Date', 'Expense', 'Income'])"
check 'days as MM/DD/YYYY' "document.querySelector('month-list h2.day').textContent === '$(mdy "$ym-28")'" "document.querySelector('month-list h2.day').textContent"
check 'amounts as €1,234.50' "$rows.includes('\"Gehalt||€2,500.00\"') && $(text '.month-total') === '€2,181.80'" "[$rows, $(text '.month-total')]"
ab fill '#q' '#leb' >/dev/null
ab press Enter >/dev/null
await 'the result count in English' "$(text '.result-count') === '6 transactions found'" "$(text '.result-count')"
ab fill '#amount' '0' >/dev/null
ab click '#tx-save' >/dev/null
await 'messages in English' "$(text '#amount-error') === 'Amount must be greater than 0'"
goto /review
await 'review in English with whole-amount axes' "$(text 'review-head h1') === 'Review' && [...document.querySelectorAll('review-chart text.tick')].some((t) => /^€[0-9,]+$/.test(t.textContent) && t.textContent !== '€0')" "[...document.querySelectorAll('review-chart text.tick')].map((t) => t.textContent)"
ab click '#logout' >/dev/null
await 'the login screen keeps the language' "$(text '.login-button') === 'Login'"
exit $failed
