# Budget

## Goal

A household knows where its money goes, without learning accounting.

## Outcome

- Recording a transaction takes seconds, on the phone, at the moment money moves. An amount, a category, a date — done.
- Recurring payments are one tap away. Rent, salary and subscriptions sit as templates under their category.
- At the end of a month or year, the household sees income against expenses and which categories ate the money.
- Everyone in the household shares one ledger. There are no accounts, balances or reconciliation — only money in and money out.

## Values

- **Fast entry beats complete data.** A missed transaction is worse than an imprecise one. The form accepts arithmetic, remembers templates and asks for nothing optional.
- **Plain words.** Expense, income, category. No debit, credit or double entry.
- **Own your data.** The ledger is one file on a server the household controls. Nothing leaves it.
- **Small and boring.** Few moving parts, so it keeps running for years with little care.

## Constraints

- Self-hosted, one instance per household. Single container, single SQLite file.
- One currency and one locale per instance (English and German).
- Mobile first, installable as an app, usable on a flaky connection.
- Behind a login. Registration is closed unless the operator opens it.

## Decisions

- **One shared ledger, not per-user books.** Users are people with access, not owners of data.
- **Categories are flat.** A note field replaces subcategories when a category needs detail.
- **Templates are suggestions, not automation.** Nothing is booked without a person confirming it.
