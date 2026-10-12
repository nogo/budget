# Budget

## Goal

A family knows where its money goes, without learning accounting.

## Outcome

- Recording a transaction takes seconds, on the phone, at the moment money moves. An amount, a category, a date — done.
- Recurring payments are one tap away. Rent, salary and subscriptions sit as templates under their category.
- At the end of a month or year, people see income against expenses and which categories ate the money.
- One instance serves the whole family. Each ledger is a separate book of money in and money out, with its own categories and templates. A couple shares one ledger; a daughter keeps her own.
- An account is a person allowed to open one or more ledgers. One ledger can be shared by several accounts. People sign in with the login they already have and choose a ledger when they have more than one.
- Nothing entered is lost. An entry made without a connection waits on the phone until it can be sent, and an entry sent twice is saved once.

## Values

- **Fast entry beats complete data.** A missed transaction is worse than an imprecise one. The form accepts arithmetic, offers templates and asks for nothing optional.
- **Plain words.** Expense, income, category. No debit, credit, balances or double entry.
- **Familiar.** The screens look and behave the way the family is used to.
- **Own your data.** Each ledger is one file on a server the family controls. Nothing leaves it.
- **Small and boring.** Few moving parts and almost no dependencies, so it keeps running for years with little care.

## Constraints

- Self-hosted. One program serves the interface and the data; one SQLite file per ledger.
- Sign-in through the family's own identity server, by the OpenID Connect standard only. The app stores no passwords.
- One language (German or English) and one currency per instance. Numbers, amounts and dates follow that language.
- Mobile first and installable on Android as an app.
- A transaction has a date, never a time.
