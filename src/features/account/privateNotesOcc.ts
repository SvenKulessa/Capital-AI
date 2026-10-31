/** Private per-account notes contract (CAPITAL_AI_PRIVATE_NOTES_OCC@2).
 * No browser persistence; never retry an uncertain write automatically. */
export type NotesSnapshot = { userId: string; notes: string; revision: string };
export type NotesConflict = { localDraft: string; baseRevision: string; serverNotes: string; serverRevision: string };
export type NotesSaveResult =
  | { kind: 'saved'; snapshot: NotesSnapshot }
  | { kind: 'conflict'; conflict: NotesConflict };

export class NotesClientError extends Error {
  constructor(public readonly code: 'SESSION_CHANGED' | 'NOTES_UNAVAILABLE' | 'INVALID_NOTES') {
    super(code);
  }
}

const MAX_REVISION = 9223372036854775807n;
export function validRevision(value: unknown): value is string {
  return typeof value === 'string' &&
    /^(0|[1-9][0-9]{0,18})$/.test(value) &&
    BigInt(value) <= MAX_REVISION;
}
export function isNotesSnapshot(body: unknown, userId: string): body is NotesSnapshot {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const item = body as Partial<NotesSnapshot>;
  return item.userId === userId && typeof item.notes === 'string' && validRevision(item.revision);
}

export async function verifyNotesSession(expectedUserId: string, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/auth/session', {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
    });
    const session = response.ok ? await response.json() : null;
    if (session?.authenticated !== true || session?.mfaRequired === true ||
        session?.user?.id !== expectedUserId) throw new NotesClientError('SESSION_CHANGED');
  } catch (error) {
    if (error instanceof NotesClientError) throw error;
    throw new NotesClientError('NOTES_UNAVAILABLE');
  }
}

export async function readNotes(userId: string, signal?: AbortSignal): Promise<NotesSnapshot> {
  try {
    const response = await fetch('/api/profile/notes', {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
    });
    if (response.status === 401) throw new NotesClientError('SESSION_CHANGED');
    if (!response.ok) throw new NotesClientError('NOTES_UNAVAILABLE');
    const body: unknown = await response.json();
    if (!isNotesSnapshot(body,userId)) throw new NotesClientError('SESSION_CHANGED');
    return body;
  } catch (error) {
    if (error instanceof NotesClientError) throw error;
    throw new NotesClientError('NOTES_UNAVAILABLE');
  }
}

export async function saveNotes(
  snapshot: NotesSnapshot, localDraft: string, signal?: AbortSignal,
): Promise<NotesSaveResult> {
  if (!validRevision(snapshot.revision) || snapshot.revision === MAX_REVISION.toString() ||
      typeof localDraft !== 'string' || localDraft.length > 10000) {
    throw new NotesClientError('INVALID_NOTES');
  }
  // Session check is advisory; the BFF remains the identity authority.
  await verifyNotesSession(snapshot.userId, signal);
  try {
    const response = await fetch('/api/profile/notes', {
      method: 'PUT', credentials: 'same-origin', cache: 'no-store', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        expectedUserId: snapshot.userId, expectedRevision: snapshot.revision, notes: localDraft,
      }),
    });
    const body: unknown = await response.json();
    if (response.status === 401 ||
        (response.status === 409 && (body as { error?: string })?.error === 'session_changed')) {
      throw new NotesClientError('SESSION_CHANGED');
    }
    if (response.status === 409) {
      const conflict = body as {
        error?: string; userId?: string; currentNotes?: string; currentRevision?: unknown;
      };
      if (conflict?.error !== 'notes_revision_conflict' || conflict.userId !== snapshot.userId ||
          typeof conflict.currentNotes !== 'string' || !validRevision(conflict.currentRevision)) {
        throw new NotesClientError('NOTES_UNAVAILABLE');
      }
      return { kind:'conflict', conflict: {
        localDraft, baseRevision:snapshot.revision,
        serverNotes:conflict.currentNotes, serverRevision:conflict.currentRevision,
      }};
    }
    if (!response.ok || !isNotesSnapshot(body,snapshot.userId) ||
        body.notes !== localDraft ||
        body.revision !== (BigInt(snapshot.revision)+1n).toString()) {
      throw new NotesClientError('NOTES_UNAVAILABLE');
    }
    return { kind:'saved', snapshot:body };
  } catch (error) {
    if (error instanceof NotesClientError) throw error;
    // Timeout or unknown commit: caller must GET before a manual retry.
    throw new NotesClientError('NOTES_UNAVAILABLE');
  }
}
