# Parity list

What the old app does, screen by screen. The rewrite passes its final test when every unchecked box below is checked on a phone and on a desktop. Screenshots of the old app are in `screenshots/`.

Taken from the code at version 2.4.0. Items marked *changed* deliberately differ from the old app.

## Everywhere

- [ ] Top bar, dark brown (`#733e0a`), fixed at the top: wallet icon and "Budget" (word hidden on small screens), app version in small text.
- [ ] Top bar links: Categories (tag icon), Templates (template icon), Review (calculator icon), Logout. Icons only on phones, icon and text from tablet width up.
- [ ] *changed:* one language per instance, German or English, set by the operator. No browser detection.
- [ ] Numbers, amounts and dates follow the instance language and currency: `1.234,50 €` and `15.10.2026` in German, `€1,234.50` and `10/15/2026` in English. Amounts always show two decimals; chart axes show whole amounts.
- [ ] Expense amounts red, income amounts green. In the review tables only the total column is coloured; income and expense columns stay black.
- [ ] *changed:* every delete is two taps on the same button. The first tap turns it into "Sure?" in place; the second tap deletes. It falls back after a few seconds, on Escape, or when focus leaves. No confirmation page or dialog.
- [ ] Desktop layout: form column on the left (one fifth, sticky), list on the right. Phone layout: form on top, list below.

## Login *changed*

- [ ] Opening the app without a session leads to the login.
- [ ] *changed:* login goes through Nextcloud (OpenID Connect). No username or password form, no registration page, no prefilled default user.
- [ ] *new:* after login, a person with more than one ledger chooses one. A person with one ledger goes straight to it.
- [ ] *new:* switching to another ledger without logging out.
- [ ] Logout ends the session and returns to the login.

## Month view (start page)

- [ ] Start page shows the current month. Address `/YYYY-MM` shows that month; an invalid month falls back to the current one.
- [ ] Title shows the month as `YYYY-MM`.
- [ ] Transactions grouped by day, newest day first, day header as `DD.MM.YYYY`. Within a day, newest entry first.
- [ ] Each row: category name, note in small grey text after a dash, amount right-aligned in a monospace font.
- [ ] Tapping a row opens it for editing in the form; the row stays highlighted.
- [ ] Bottom bar, sticky: button to the previous month, month total (income minus expense, red or green, hidden when zero), button to the next month.

## Search

- [ ] Search field above the list, with a clear button and a submit button. Placeholder explains the syntax.
- [ ] `#name` filters by category; partial and case-insensitive (`#leb` finds Lebensmittel); umlauts work. Several `#` terms combine as "any of".
- [ ] `=25,50` or `=25.50` filters by exact amount.
- [ ] Remaining words search the note; every word must appear.
- [ ] With words in the search, all months are searched. With only `#` or `=` terms, the search stays inside the shown month. Examples: `bäcker` finds every month; `#leb` finds the shown month only; `kuchen #leb` finds every month.
- [ ] Shows the number of results.
- [ ] The search stays in the address and survives opening a transaction.

## Transaction form

- [ ] Fields in this order: amount, category, note, templates, date, expense/income.
- [ ] Amount accepts arithmetic: `12+4,50` shows `= 16.5` beside the field and saves 16.50. Comma and dot both work as decimal mark. Only digits and `+ - * / ( ) , .` can be typed.
- [ ] Amount field selects its content on focus.
- [ ] Amount must be greater than zero; the message appears below the field.
- [ ] Category is a dropdown, ordered as the categories were created. First category preselected.
- [ ] Note field appears only when the chosen category has notes switched on.
- [ ] Templates of the chosen category appear as buttons below (new entry only). Button label: the note, or `(day.) amount`, or `(day.)`. Colour by type.
- [ ] Tapping a template fills amount (if set), note (if set), type, and the date: that day in the shown month, or the month's last day if the month is shorter.
- [ ] Date defaults to today's day number in the shown month.
- [ ] Expense preselected.
- [ ] New entry: one full-width save button (check icon). After saving, the form resets and the list shows the entry.
- [ ] Editing: delete button (red, trash icon), "save as template" button (copies category, note, amount, type and day of month), save button.
- [ ] Spinner on the save button while saving.
- [ ] *new:* a new entry made offline waits on the phone and is sent when the connection returns. The app shows that it is offline and how many entries are waiting.
- [ ] *new:* sending the same new entry twice saves it once.

## Templates

- [ ] Address `/templates`. Left: form to add a template. Right: list of all templates.
- [ ] Add form fields: category, note (only if the category has notes), expense/income, day of month (1–31, today preselected), amount (may be zero).
- [ ] List grouped by category, each group sorted by day. Row: day badge (`5.`), note, amount right-aligned, coloured by type. Empty list shows a "no templates" line.
- [ ] Tapping a row opens it for editing on the left with a delete button; the row stays highlighted.

## Categories

- [ ] Address `/categories`. One list with an add row on top: name field, "has notes" checkbox, save button.
- [ ] Each row: name, "with notes" hint, edit and delete icons. *changed:* no merge icon.
- [ ] Edit page: name, "has notes" checkbox, cancel and save.
- [ ] *changed:* the delete icon in the row deletes with two taps. No separate delete page.
- [ ] *changed:* deleting a category that still has transactions or templates is refused with a message. The old app does not check this.

## Review

- [ ] Address `/review`: one row per year, oldest first. Columns: year (button to that year), income, expense, total (red or green). Footer row with the sums.
- [ ] Bar chart beside the table: income and expense per year. Checkbox "accumulated total" adds a running-total line; the checkbox appears only when there is data to accumulate.
- [ ] Category filter above: dropdown to add categories, chips with a remove button, "clear all". The filter stays in the address and carries over to the year pages.
- [ ] Address `/review/YYYY`: same layout per month of that year, previous and next year buttons. Each month row has a button to the month review and a button to the month's transaction list.
- [ ] Address `/review/YYYY/M`: one row per category with income, expense, total, footer with sums. Previous and next month buttons. *changed:* no pie chart; the table stands alone until the chart redesign.
- [ ] *changed:* months are counted by calendar day, so entries on the 1st land in the right month (see the date fix).

## Installed app (PWA)

- [ ] Installable on Android from the browser, opens without browser chrome, brown theme colour, wallet icon.
- [ ] App shell loads without a connection.
- [ ] When a new version is ready, a notice offers "update now" or "later". No automatic reload.

## Known defects of the old app, not to copy

- Category delete does not enforce the link to transactions and templates. The tables declare the link, but SQLite checks it only when each connection switches it on, and the old app never does. The new app switches it on at every connection. The household data has no broken links today.
- The category list is readable without login.
- The month review table labels the category column "month".
- The template add form preselects category id 1 instead of the first existing category.
- Amount search compares floating-point numbers exactly.
