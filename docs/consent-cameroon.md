# Consent in a Cameroonian mobile app: research notes

Research done on 19 October 2026 to guide the build. **This is not legal
advice.** Every point marked "Lawyer" needs a Cameroonian lawyer's answer
before launch.

Sources: the certified copy of Law No. 2024/017 of 23 December 2024 (a
third-party scan of the Presidency document:
https://droit-et-politique-en-afrique.info/wp-content/uploads/2024/12/Loi-du-23-decembre-2024-protection-des-donnees-personnelles-au-Cameroun.pdf),
Laws 2010/012 and 2010/013 (art.cm), Law 2010/021 (mincommerce.gov.cm), and the
Apple, Google Play and WhatsApp Business policies. Article numbers below come
from those texts.

## What the law says

| Topic | Rule | Article |
|---|---|---|
| Legal basis | Consent is the rule: prior, free, informed, specific and unambiguous. The only exceptions are a legal obligation, a public interest mission, and protecting someone's health. **There is no "contract" or "legitimate interest" basis**, unlike the GDPR | Law 2024/017 art. 9, 50 |
| Information at collection | Who we are, purposes, data, recipients, the right to refuse, the user's rights, retention, and **any transfer abroad** | art. 21 |
| Minors | Under 18: consent counts only with a parent's or legal guardian's | art. 9(3) |
| Sensitive data | Includes religious opinions and activities. Processing is forbidden (art. 48), yet art. 66 punishes keeping it "without express consent". Lawyer: does express consent make it lawful? | art. 5, 48, 66 |
| Transfers abroad | Need the data protection Authority's **prior authorisation**. Our Supabase (Paris) and Google Translation are transfers | art. 32; fines art. 60, 69 |
| Authorisation of processing | All processing needs prior authorisation; keep a register; yearly security report; impact assessment when high risk | art. 19, 27, 29, 33 |
| Rights | Access, rectification, erasure (without delay), objection, portability, limitation, no automated decisions. Deadlines are left to a future regulation | art. 37 to 47 |
| Breaches | Tell the Authority **and** the people affected without delay | art. 22 |
| In force | Compliance deadline was 23 June 2026 | art. 73 |
| Terminal storage | Storing or reading data on a user's device needs prior consent, with no exemption for strictly necessary storage. Lawyer: does this reach on-device app storage and website storage? | Law 2010/012 art. 47 |
| Marketing | Messages by email and similar (likely SMS and WhatsApp) need prior consent and an opt-out | Law 2010/021 art. 7; Law 2010/012 art. 48 |

**The Authority is probably not operating yet.** Its organising decree was not
found; commentators say it is not operational. So the authorisations in art. 19
and 32 likely cannot be obtained today. Lawyer: how to document good faith in
the meantime.

## What this means for Meyalo

What already fits:
- The discovery profile (including faith interests), saved and hidden events
  stay on the phone and are never sent to the server. Keep it that way.
- Translation sends only public event text and an event id, not personal data.
- No analytics, no ads, no tracking, so no App Tracking Transparency prompt.
- Calendar: iOS asks only for write access, on first tap; Android needs no
  permission at all.

What to build before launch:
1. **Consent at every server submission.** Reports, feedback and event
   suggestions get an unticked checkbox (FR and EN) saying what is sent, why,
   that it is stored in France, and how to withdraw.
2. **A consent record**: purpose, notice version, language, time, and later the
   withdrawal time, in an append-only table. No message content.
3. **Privacy settings in You**: each purpose with a switch, plus "Delete my
   data on this phone" and, with accounts, account deletion in the app and on
   the web (Apple 5.1.1(v), Google Play).
4. **Age range before any server consent**, with under-18s either blocked from
   server features or asked for a parent's confirmation. Lawyer: what counts as
   parental consent.
5. **An explanation screen before each system permission** (notifications,
   calendar read for conflicts). Google requires it right before the prompt.
6. **Marketing opt-ins per channel** (WhatsApp, email, SMS), unticked, recorded,
   with opt-out honoured everywhere.
7. **A website with no cookies or trackers**, so no banner is needed.
8. **Paperwork**: register of processing, breach runbook, and a filing with the
   Authority once it exists.

## Questions for the lawyer
1. How to comply with art. 19 and 32 while the Authority is not operating.
2. Whether art. 48 forbids faith interests even with express consent (today
   they never leave the phone).
3. Whether Law 2010/012 art. 47 covers app storage on the phone and website
   storage.
4. Whether the 10-year retention in Law 2010/012 art. 46 applies to us.
5. Acceptable parental consent for under-18s.
6. Whether anonymous reports are personal data because of IP addresses (art. 5
   lists IP addresses).
