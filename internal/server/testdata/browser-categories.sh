#!/usr/bin/env bash
# Categories: one list with an add row on top; each row shows the name, a
# "with notes" hint, an edit link and a two-tap delete; the edit page has
# name, checkbox, back and save; a category still in use is refused with a
# message; a duplicate name too.
export BUDGET_FIXTURE_ACCOUNT=john
source "$(dirname "$0")/lib-browser.sh"
names="JSON.stringify([...document.querySelectorAll('.cat-row .cat-name')].map((n) => n.textContent.replace(/\\s+/g, ' ').trim()))"
row() { echo "[...document.querySelectorAll('.cat-row')].find((r) => r.querySelector('.cat-name').firstChild.textContent.trim() === '$1')"; }

login
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
ab click '.bar-end a[href="/categories"]' >/dev/null
await 'the top bar opens /categories' "location.pathname === '/categories' && document.querySelectorAll('.cat-row').length === 6" "document.body.innerText"
check 'rows by creation, with the notes hint' "$names === JSON.stringify(['Bäcker', 'Lebensmittel', 'Mittag', 'Unterhaltung mit Notizen', 'Fahrtkosten mit Notizen', 'Gehalt'])" "$names"
check 'the add row: name, has notes, save' "$(text 'label[for=cat-name]') === 'Neue Kategorie' && document.querySelector('#cat-notes').type === 'checkbox' && $(text '#cat-add label.check') === 'mit Notizen' && !!document.querySelector('#cat-save')"
check 'the installed version shows under the list' "$(text '.app-version') === 'Budget vfixture'" "$(text '.app-version')"
check 'each row has an edit link and a delete button' "[...document.querySelectorAll('.cat-row')].every((r) => r.querySelector('a[href^=\"/categories/\"]') && r.querySelector('button[data-arm]'))"
check 'no merge icon' "document.querySelectorAll('.cat-row a, .cat-row button').length === 12"

ab fill '#cat-name' 'Haustier' >/dev/null
ab check '#cat-notes' >/dev/null
ab click '#cat-save' >/dev/null
await 'a new category joins the end of the list' "JSON.parse($names).at(-1) === 'Haustier mit Notizen' && document.querySelector('#cat-name').value === '' && !document.querySelector('#cat-notes').checked" "$names"
ab fill '#cat-name' 'Haustier' >/dev/null
ab click '#cat-save' >/dev/null
await 'a duplicate name is refused with a message' "!!document.querySelector('#cat-add .error')?.textContent && JSON.parse($names).length === 7" "document.querySelector('#cat-add').innerText"
ab fill '#cat-name' '' >/dev/null

id=$(value "$(row Haustier).id.slice(4)")
ab click "#cat-$id a" >/dev/null
await 'edit opens its page' "location.pathname === '/categories/$id' && $(text '.page-title') === 'Kategorie bearbeiten' && document.querySelector('#cat-$id').classList.contains('selected') && document.querySelector('#edit-name').value === 'Haustier' && document.querySelector('#edit-notes').checked" "document.querySelector('categories-view').innerText"
check 'with back and save' "$(text '#edit-cancel') === 'Zurück' && !!document.querySelector('#edit-save')"
ab click '#edit-cancel' >/dev/null
await 'back returns to the list unchanged' "location.pathname === '/categories' && JSON.parse($names).at(-1) === 'Haustier mit Notizen'"
ab click "#cat-$id a" >/dev/null
await 'edit again' "document.querySelector('#edit-name')?.value === 'Haustier'"
ab fill '#edit-name' 'Haustiere' >/dev/null
ab uncheck '#edit-notes' >/dev/null
ab click '#edit-save' >/dev/null
await 'saving renames and returns to the list' "location.pathname === '/categories' && JSON.parse($names).at(-1) === 'Haustiere'" "[location.pathname, $names]"
ab click "#cat-1 a" >/dev/null
await 'Bäcker opens' "document.querySelector('#edit-name')?.value === 'Bäcker'"
ab fill '#edit-name' 'Lebensmittel' >/dev/null
ab click '#edit-save' >/dev/null
await 'renaming to a taken name is refused on the page' "location.pathname === '/categories/1' && !!document.querySelector('#edit-error')?.textContent" "document.querySelector('categories-view').innerText"
goto /categories

ab click "#cat-delete-$id" >/dev/null
await 'the first tap on delete asks "Sicher?"' "$(text "#cat-delete-$id") === 'Sicher?' && document.querySelectorAll('.cat-row').length === 7"
ab click "#cat-delete-$id" >/dev/null
await 'the second deletes an unused category' "document.querySelectorAll('.cat-row').length === 6 && !$names.includes('Haustiere')" "$names"

ab click '#cat-delete-1' >/dev/null
ab click '#cat-delete-1' >/dev/null
await 'a category in use is refused, the row says why' "!!document.querySelector('#cat-1 .error')?.textContent && document.querySelectorAll('.cat-row').length === 6" "document.querySelector('#cat-1').innerText"
check 'the delete button is back to normal' "document.querySelector('#cat-delete-1').getAttribute('aria-label') === 'Bäcker löschen'"
ab click '#cat-delete-3' >/dev/null
ab press Escape >/dev/null
await 'Escape disarms' "document.querySelector('#cat-delete-3').getAttribute('aria-label') === 'Mittag löschen'"
exit $failed
