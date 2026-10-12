#!/usr/bin/env bash
# Login for an account with one ledger: straight to its current month,
# never the ledger choice, no ledger switch in the top bar.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"

ab open "$url/" >/dev/null
ab set viewport 1280 900 >/dev/null
await 'without a session the login screen shows' "!!document.querySelector('login-screen .login-button')"
ab click '.login-button' >/dev/null
await 'after login the only ledger opens straight away' "!!document.querySelector('month-view') && $(text '.month-title') === '$ym' && document.querySelectorAll('month-list .row').length === 20" "document.body.innerText.slice(0, 300)"
check 'the ledger choice never showed' "!document.querySelector('ledger-choice')"
check 'no ledger switch in the top bar' "!document.querySelector('.ledger-switch')"
goto /ledgers
await '/ledgers lists only the one ledger' "document.querySelectorAll('.ledger-choice').length === 1"
exit $failed
