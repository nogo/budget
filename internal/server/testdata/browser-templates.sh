#!/usr/bin/env bash
# Templates: the add form beside the list grouped by category and sorted
# by day; a row opens for editing with a two-tap delete; an empty list
# says so.
source "$(dirname "$0")/lib-browser.sh"
list="document.querySelector('template-list')"
groups="JSON.stringify([...document.querySelectorAll('template-list h2.day')].map((h) => h.textContent))"
tplrows="JSON.stringify([...document.querySelectorAll('template-list .row')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim() + (r.classList.contains('income') ? ' +' : ' -')))"
labels="JSON.stringify([...document.querySelectorAll('#tpl-form label')].map((l) => l.textContent.trim()))"

login household
await 'the month has loaded' "document.querySelectorAll('month-list .row').length === 20"
ab click '.bar-end a[href="/templates"]' >/dev/null
await 'the top bar opens /templates' "location.pathname === '/templates' && document.querySelectorAll('template-list .row').length === 5" "$list?.innerText"
check 'grouped by category, each sorted by day' "$groups === JSON.stringify(['Gehalt', 'Fahrtkosten', 'Unterhaltung', 'Mittag'])" "$groups"
check 'a row: day badge, note, amount, coloured by type' "$tplrows === JSON.stringify(['1. 2.500,00 € +', '3. Monatskarte 49,00 € -', '13. Streaming 12,99 € -', '31. Monatsende 9,50 € -', '15. Kantine 0,00 € -'])" "$tplrows"
check 'the add form: category, type, day, amount' "$labels === JSON.stringify(['Kategorie', 'Ausgabe', 'Einnahme', 'Tag des Monats', 'Betrag'])" "$labels"
check 'the first category, expense and today are preselected' "document.querySelector('#tpl-category').value === '1' && document.querySelector('#tpl-expense').checked && document.querySelector('#tpl-day').value === '$((10#$today))'" "[document.querySelector('#tpl-category').value, document.querySelector('#tpl-day').value]"

ab select '#tpl-category' 'Fahrtkosten' >/dev/null
await 'the note appears for a category with notes' "!!document.querySelector('#tpl-note')"
check 'note after category' "$labels === JSON.stringify(['Kategorie', 'Notiz', 'Ausgabe', 'Einnahme', 'Tag des Monats', 'Betrag'])" "$labels"
ab fill '#tpl-note' 'Parken' >/dev/null
ab fill '#tpl-day' '7' >/dev/null
ab fill '#tpl-amount' '2,5' >/dev/null
ab click '#tpl-save' >/dev/null
await 'a new template joins its group by day' "$tplrows.includes('\"3. Monatskarte 49,00 € -\",\"7. Parken 2,50 € -\"')" "$tplrows"
await 'the form resets' "document.querySelector('#tpl-category').value === '1' && !document.querySelector('#tpl-note')"
ab click '#tpl-save' >/dev/null
await 'an amount of zero is fine' "$tplrows.includes('\"$((10#$today)). 0,00 € -\"') && $groups.includes('Bäcker')" "$tplrows"

id=$(value "[...document.querySelectorAll('template-list .row')].find((r) => r.innerText.includes('Parken')).id.slice(9)")
tap "#template-$id"
await 'a row opens for editing' "location.pathname === '/templates/$id' && document.querySelector('#tpl-note')?.value === 'Parken' && document.querySelector('#tpl-day').value === '7' && document.querySelector('#tpl-amount').value === '2.5'" "document.querySelector('template-form').innerText"
check 'the row stays highlighted' "document.querySelector('#template-$id').classList.contains('selected')"
check 'editing has delete and save' "!!document.querySelector('#tpl-delete') && !!document.querySelector('#tpl-save')"
ab click '#tpl-income' >/dev/null
ab fill '#tpl-day' '9' >/dev/null
ab click '#tpl-save' >/dev/null
await 'saving returns to the list with the change' "location.pathname === '/templates' && $tplrows.includes('\"9. Parken 2,50 € +\"')" "[location.pathname, $tplrows]"

tap "#template-$id"
await 'it opens again' "location.pathname === '/templates/$id' && !!document.querySelector('#tpl-delete')"
ab click '#tpl-delete' >/dev/null
await 'the first tap asks "Sicher?"' "$(text '#tpl-delete') === 'Sicher?' && !!document.querySelector('#template-$id')"
ab click '#tpl-delete' >/dev/null
await 'the second deletes' "location.pathname === '/templates' && !document.querySelector('#template-$id') && !$tplrows.includes('Parken')" "[location.pathname, $tplrows]"

goto /ledgers
ab click '#ledger-kid' >/dev/null
goto /templates
await 'Kid has one template' "document.querySelectorAll('template-list .row').length === 1"
tap 'template-list .row'
await 'it opens' "!!document.querySelector('#tpl-delete')"
ab click '#tpl-delete' >/dev/null
ab click '#tpl-delete' >/dev/null
await 'an empty list says how to add one' "document.querySelectorAll('template-list .row').length === 0 && $(text 'template-list .empty') === 'Keine Vorlagen gefunden. Erstelle eine neue Vorlage mit dem Formular auf der linken Seite.'" "$list.innerText"
exit $failed
