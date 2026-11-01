/**
 * - `saved`: the user confirmed the entry (iOS reports this).
 * - `opened`: the calendar screen was shown; Android does not say whether the
 *   user saved, so nothing more is claimed.
 * - `downloaded`: the web .ics file was handed to the browser.
 * - `cancelled`, `denied`: nothing was added.
 */
export type AddToCalendarResult =
  | 'saved'
  | 'opened'
  | 'downloaded'
  | 'cancelled'
  | 'denied';
