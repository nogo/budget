#!/usr/bin/env bash
# The update notice: when a new version waits, a banner under the top bar
# offers "update now" or "later", in the page and never over it; nothing
# reloads by itself. The fixture serves one version, so the check sets the
# store's flag the service worker sets.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
check 'no notice while nothing waits' "document.querySelector('update-banner').childElementCount === 0"
ab eval "import('/js/state.js').then((m) => { m.store.set({ updateReady: true }); window.__stay = 1; return true; })" >/dev/null
await 'a waiting version shows the notice' "$(text '.update-banner span') === 'Eine neue Version von Budget ist bereit.' && $(text '#update-now') === 'Jetzt aktualisieren' && $(text '#update-later') === 'Später'" "document.querySelector('update-banner').innerHTML"
check 'it sits in the page flow above the content' "getComputedStyle(document.querySelector('.update-banner')).position === 'static' && document.querySelector('.update-banner').getBoundingClientRect().bottom <= document.querySelector('#app').getBoundingClientRect().top + 1"
check 'the page did not reload' "window.__stay === 1"
ab click '#update-later' >/dev/null
await '"Später" hides it' "document.querySelector('update-banner').childElementCount === 0 && window.__stay === 1"
exit $failed
