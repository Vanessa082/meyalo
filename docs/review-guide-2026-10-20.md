# Review guide: the work committed on 2026-10-20

Everything built after commit `f3758a0` was committed on 2026-10-20 at the
owner's request, **without the /ownership check**: the owner had no time and
asked for this guide to read later. The check is still owed. Until it is
done, treat these commits as unreviewed. Nothing here has gone to `main` or
to the hosted Supabase project.

Some of this work was written by other Claude sessions in the same folder
(legal texts, earlier phases). All of it is in these commits.

## The four commits

| Commit | What it holds |
|---|---|
| Database | Migrations 006 to 014, pgTAP tests 01 to 11, the `translate-event` and `delete-account` functions, the sign-in email template, local config, the RLS script |
| Brand | Logo, icons, splash, favicon, welcome video, brand scripts, `BRAND.md` |
| App | Everything in `src/`, `app.config.ts`, dependencies |
| Docs | Specs, decisions, configuration, consent research, change log, this guide |

## What was built (most recent first)

1. **Optional accounts** (spec: `docs/product-decisions.md`, "Spec: accounts"). Email code sign-in, backup of plans and profile across phones, account deletion with an anonymous record, retention jobs. Apple sign-in written but never run; Google not built.
2. **After an event ends**: ended banner, "Did you go?", private notes, "How was it?" reminder, Past in My Month.
3. **Consent and notifications**: consent box at every report and suggestion, age group, Privacy and notifications screen, permission explanations, local reminders.
4. **Earlier phases** (summarised in `docs/changes-2026-10.md`): offline cache, Supabase hardening, verification evidence, event supply, search, image upload, My Month, personalisation, the blue rebrand and the welcome video.

## Read in this order (about 2 hours for the important parts)

1. **Who can read and write what.** `supabase/migrations/013_accounts.sql`, then `006_hardening.sql` and `012_consent.sql`. Every rule there is checked by `supabase/tests/*.test.sql`.
2. **Account deletion.** `supabase/functions/delete-account/delete-account.ts` (order: record, then delete, then take the record back if the deletion fails) and `index.ts` (the account comes only from the verified token).
3. **Backup merge.** `src/services/plan-sync.ts` and the `sync_account` function in 013: for one event each field keeps its latest change. They must agree.
4. **Session on phones.** `src/lib/sealed-storage.ts` and `session-storage.native.ts`.
5. **Words people will read.** `src/content/legal/privacy.ts` and `delete-account.ts`; search for `UNVERIFIED`, `NOT BUILT YET`, `CONFIRM`.

## The ownership questions still owed

Answer each in your own words before merging to `main`.

1. What problem do accounts solve, and why are they optional?
2. You save an event on phone A and remove it on phone B. Which wins, and where is that rule enforced (two places)?
3. When someone deletes their account, what is deleted, what is kept, and for how long?
4. Why can a curator not delete their own account from the app?
5. Why is the session on phones sealed with a key in secure storage instead of stored in secure storage directly?
6. A report is sent while signed in. What links it to the account, and what happens to it when the account is deleted?
7. What stops one signed-in person from reading another person's plans? Name the mechanism and the test that proves it.
8. Which parts were never run on a real phone, and what could go wrong there?

## Not verified

- On a phone: reminders, permission prompts, Apple sign-in and its nonce, the sealed session storage, the welcome video.
- Legal texts: written without a lawyer; marked where unchecked.
- Inactive account deletion: promised in the policy, marked NOT BUILT YET.

## Checks run before committing (2026-10-20, local Supabase)

`pnpm typecheck` (0 errors), `pnpm lint` (clean), `pnpm test` (439 pass), `supabase test db` (11 files, 153 tests, pass), `pnpm test:rls` (pass), Android bundle export (pass). Browser walkthroughs: consent at reports and suggestions, Privacy and notifications, clear data, past events, sign in with an email code, merge of two phones' plans, removal backup, account deletion, curator refusal.

## Owner actions before launch

Listed in `docs/configuration.md`. The blockers for accounts: an email provider and your own sending domain, the hosted Supabase plan, and migrations 003 to 014 applied in order.
