# Shared setup for the browser checks (browser-*.sh): builds the server test
# binary, serves the invented fixture (TestServeFixture), and defines the
# check helpers. Source it from a check script; each script gets its own
# server and browser session, so the scripts don't depend on each other.
# Set BUDGET_FIXTURE_ACCOUNT (jane: both ledgers, john: household only) or
# BUDGET_FIXTURE_LANG (de, en) before sourcing it to change the instance.
# agent-browser picks its Chrome up from its own install, or from
# AGENT_BROWSER_EXECUTABLE_PATH.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
session="budget-$(basename "$0" .sh)-$$"
work=$(mktemp -d)
if command -v go >/dev/null; then go test -c -o "$work/server.test" ./internal/server; else mise exec -- go test -c -o "$work/server.test" ./internal/server; fi
BUDGET_SERVE=1 BUDGET_FIXTURE_ACCOUNT="${BUDGET_FIXTURE_ACCOUNT:-jane}" BUDGET_FIXTURE_LANG="${BUDGET_FIXTURE_LANG:-de}" \
	"$work/server.test" -test.run '^TestServeFixture$' -test.timeout 0 >"$work/serve.log" 2>&1 &
server=$!
# Chrome throttles timers in a page it deems in the background, e.g. a
# window another app covers; the checks wait on them.
export AGENT_BROWSER_ARGS="${AGENT_BROWSER_ARGS:+$AGENT_BROWSER_ARGS,}--disable-background-timer-throttling,--disable-renderer-backgrounding,--disable-backgrounding-occluded-windows"
ab() { agent-browser --session "$session" "$@"; }
trap 'kill $server 2>/dev/null; ab close >/dev/null 2>&1; rm -rf "$work"' EXIT

for _ in $(seq 100); do
	grep -q '^budget: ' "$work/serve.log" && break
	sleep 0.1
done
url=$(sed -n 's/^budget: //p' "$work/serve.log")
[ -n "$url" ] || { cat "$work/serve.log"; exit 1; }

failed=0
pass() { echo "ok   $1"; }
fail() { echo "FAIL $1"; failed=1; }

# check NAME JS [DEBUG_JS]: the expression must be true now.
check() {
	if [ "$(ab eval "$2")" = true ]; then pass "$1"; else fail "$1 (${3:+$(ab eval "$3" 2>&1 || true)})"; fi
}

# await NAME JS [DEBUG_JS]: the expression must become true within 5 s.
await() {
	for _ in $(seq 50); do
		if [ "$(ab eval "$2")" = true ]; then pass "$1"; return; fi
		sleep 0.1
	done
	fail "$1 (${3:+$(ab eval "$3" 2>&1 || true)})"
}

# The fixture's months: household has the same rows in this month and the
# month before, and a few rows in March and November of two earlier years.
ym=$(date +%Y-%m)
prev=$(date -d "$(date +%Y-%m-01) -1 month" +%Y-%m)
next=$(date -d "$(date +%Y-%m-01) +1 month" +%Y-%m)
year=$(date +%Y)
today=$(date +%d)

# login: sign in through the development login and wait for the app; with
# a ledger given, choose it when the ledger choice shows.
login() {
	ab open "$url/auth/login" >/dev/null
	ab set viewport 1280 900 >/dev/null
	for _ in $(seq 50); do
		[ "$(ab eval "!!document.querySelector('ledger-choice .ledger-choice, month-view .row')")" = true ] && break
		sleep 0.1
	done
	if [ -n "${1:-}" ] && [ "$(ab eval "!!document.querySelector('#ledger-$1')")" = true ]; then
		ab click "#ledger-$1" >/dev/null
	fi
}

# tap SEL: click SEL after scrolling it to the middle of the window, clear
# of the fixed top bar and the sticky month bar.
tap() {
	ab eval "document.querySelector('$1').scrollIntoView({ block: 'center' }); true" >/dev/null
	ab click "$1" >/dev/null
}

# goto PATH: open an app route and wait until the screen has loaded.
goto() {
	ab open "$url$1" >/dev/null
	for _ in $(seq 50); do
		[ "$(ab eval "!!document.querySelector('#app > *') && !document.querySelector('#app .empty')?.textContent.startsWith('$(loading)')")" = true ] && return
		sleep 0.1
	done
}
loading() { [ "${BUDGET_FIXTURE_LANG:-de}" = en ] && echo 'Loading' || echo 'Lädt'; }

# text SEL: a JS expression for the element's text, spaces (also the
# non-breaking ones Intl puts before €) collapsed to one.
text() { echo "document.querySelector('$1')?.textContent.replace(/\\s+/g, ' ').trim()"; }
# value JS: the expression's value as plain text, for shell variables.
value() { ab eval "$1" | tr -d '"'; }
count() { echo "document.querySelectorAll('$1').length"; }
# rows: the month list's rows as "category|note|amount", top to bottom.
rows="JSON.stringify([...document.querySelectorAll('month-list .row')].map((r) => [r.querySelector('.cat').textContent, r.querySelector('.note')?.textContent.replace(/^ - /, '') ?? '', r.querySelector('.amount').textContent.replace(/\\s+/g, ' ')].join('|')))"
# listed: the month list shows the route's month, not the last one while
# the new one loads.
listed="!document.querySelector('month-list [aria-busy=true]')"
days="JSON.stringify([...document.querySelectorAll('month-list h2.day')].map((h) => h.textContent))"
