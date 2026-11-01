// Account deletion (docs/product-decisions.md, "Spec: accounts"). Pure:
// index.ts wires it to Supabase; tested with Node in
// src/services/delete-account.test.ts.
//
// Order: write the anonymous deletion record, then delete the auth user,
// which removes the profile, plans and consents (ON DELETE CASCADE) and
// unlinks reports and suggestions (SET NULL). If the deletion fails, the
// record is taken back, so no record ever claims a deletion that did not
// happen.

export type DeleteSource = 'app' | 'web';

export interface DeletionRecord {
  user_hash: string;
  account_created_at: string | null;
  consent_versions: string[];
  source: DeleteSource;
}

export interface DeleteDeps {
  isCurator(userId: string): Promise<boolean>;
  accountCreatedAt(userId: string): Promise<string | null>;
  consentVersions(userId: string): Promise<string[]>;
  /** One-way: SHA-256 as 64 hex characters. */
  hash(value: string): Promise<string>;
  writeRecord(record: DeletionRecord): Promise<string>;
  removeRecord(id: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

export interface DeleteResult {
  status: 200 | 409 | 500;
  body: { deleted: true } | { error: 'curator' | 'failed' };
}

export async function handleDelete(
  deps: DeleteDeps,
  userId: string,
  source: DeleteSource,
): Promise<DeleteResult> {
  // Curator accounts are the evidence trail of verification: an admin
  // removes them (events.checked_by, event_checks.checked_by).
  if (await deps.isCurator(userId)) {
    return { status: 409, body: { error: 'curator' } };
  }
  const recordId = await deps.writeRecord({
    user_hash: await deps.hash(userId),
    account_created_at: await deps.accountCreatedAt(userId),
    consent_versions: await deps.consentVersions(userId),
    source,
  });
  try {
    await deps.deleteUser(userId);
  } catch {
    await deps.removeRecord(recordId);
    return { status: 500, body: { error: 'failed' } };
  }
  return { status: 200, body: { deleted: true } };
}

export function parseSource(body: unknown): DeleteSource {
  return (body as { source?: unknown } | null)?.source === 'web'
    ? 'web'
    : 'app';
}
