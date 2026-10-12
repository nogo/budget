#!/usr/bin/env bash
# Login and ledgers for an account with two ledgers: without a session the
# login screen shows; after login the person chooses a ledger, switches to
# the other from the top bar without logging out, and logout returns to
# the login.
source "$(dirname "$0")/lib-browser.sh"

ab open "$url/" >/dev/null
ab set viewport 1280 900 >/dev/null
await 'without a session the login screen shows' "!!document.querySelector('login-screen .login-button')" "document.body.innerHTML"
check 'it shows the wallet, "Budget" and one sign-in link to /auth/login' "$(text '.login-title') === 'Budget' && !!document.querySelector('.login-title svg') && document.querySelectorAll('login-screen a, login-screen button, login-screen input').length === 1 && document.querySelector('.login-button').getAttribute('href') === '/auth/login' && $(text '.login-button') === 'Anmelden'" "document.querySelector('login-screen').innerHTML"
check 'no top bar without a session' "document.querySelector('top-bar').childElementCount === 0"

ab click '.login-button' >/dev/null
await 'after login an account with two ledgers chooses one' "JSON.stringify([...document.querySelectorAll('.ledger-choice')].map((b) => b.textContent.trim())) === '[\"Haushalt\",\"Kid\"]'" "document.body.innerText"
check 'the top bar titles the choice' "$(text '.page-title') === 'Kassenbuch wählen' && document.querySelectorAll('h1').length === 1"
ab click '#ledger-household' >/dev/null
await 'choosing Haushalt opens its current month' "location.pathname === '/' && $(text '.month-title') === '$ym' && document.querySelectorAll('month-list .row').length === 20" "[location.pathname, document.body.innerText.slice(0, 300)]"
check 'the top bar names the ledger and links to the choice' "$(text '.ledger-switch .ledger-name') === 'Haushalt' && document.querySelector('.ledger-switch').getAttribute('href') === '/ledgers'"
check 'the top bar titles the month' "$(text '.page-title') === new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date('$ym-01T00:00:00Z')) && document.title.endsWith(' – Budget')" "$(text '.page-title')"
check 'the top bar links categories, templates, review and has logout' "JSON.stringify([...document.querySelectorAll('.bar-end .bar-link')].map((a) => a.textContent.trim())) === '[\"Kategorien\",\"Vorlagen\",\"Auswertung\",\"Abmelden\"]'" "document.querySelector('.bar-end').innerText"

ab click '.ledger-switch' >/dev/null
await 'the switch opens the ledger choice' "location.pathname === '/ledgers' && !!document.querySelector('#ledger-kid')"
check 'the current ledger is marked' "document.querySelector('#ledger-household').getAttribute('aria-current') === 'true'"
ab click '#ledger-kid' >/dev/null
await 'choosing Kid shows its month without logging out' "location.pathname === '/' && $(text '.ledger-switch .ledger-name') === 'Kid' && JSON.stringify([...document.querySelectorAll('month-list .row .cat')].map((c) => c.textContent)) === '[\"Süßigkeiten\",\"Süßigkeiten\",\"Taschengeld\"]'" "$rows"
check 'the form offers Kid categories' "JSON.stringify([...document.querySelectorAll('#category option')].map((o) => o.textContent)) === '[\"Taschengeld\",\"Süßigkeiten\"]'" "document.querySelector('#category').innerHTML"
ab reload >/dev/null
await 'the chosen ledger survives a reload' "$(text '.ledger-switch .ledger-name') === 'Kid' && document.querySelectorAll('month-list .row').length === 3"

ab click '#logout' >/dev/null
await 'logout returns to the login' "!!document.querySelector('login-screen .login-button') && location.pathname === '/'"
ab reload >/dev/null
await 'the session is gone after a reload' "!!document.querySelector('login-screen .login-button')"
ab click '.login-button' >/dev/null
await 'logging in again asks for the ledger again' "!!document.querySelector('#ledger-household')"
exit $failed
