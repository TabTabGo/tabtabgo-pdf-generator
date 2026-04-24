import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

interface OfficeFileStoreEntry {
  id: string;
  token: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
  expiresAt: number;
}

interface StoreOfficeFileInput {
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

/** Discriminated result returned by {@link OfficeFileStore.get}. */
export type GetFileResult =
  | { found: true; entry: OfficeFileStoreEntry }
  | { found: false; reason: 'not-found' | 'invalid-token' | 'expired' };

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export class OfficeFileStore {
  private readonly entries = new Map<string, OfficeFileStoreEntry>();

  store(input: StoreOfficeFileInput): OfficeFileStoreEntry {
    this.cleanupExpiredEntries();

    const entry: OfficeFileStoreEntry = {
      id: randomUUID(),
      token: randomBytes(24).toString('hex'),
      fileName: input.fileName,
      contentType: input.contentType,
      buffer: input.buffer,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    };

    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * Retrieves and removes the entry only on a *successful* (token-valid,
   * non-expired) lookup — single-use semantics preserved without the race
   * where a wrong-token probe or ONLYOFFICE retry evicts the real entry.
   *
   * Returns a discriminated result so callers can log distinct failure modes
   * (not-found vs. invalid-token vs. expired) at the appropriate severity.
   */
  get(id: string, token: string): GetFileResult {
    this.cleanupExpiredEntries();

    const entry = this.entries.get(id);
    if (!entry) {
      return { found: false, reason: 'not-found' };
    }

    if (entry.expiresAt <= Date.now()) {
      return { found: false, reason: 'expired' };
    }

    // Constant-time comparison to prevent timing attacks on this publicly
    // reachable endpoint (no apiKeyAuth guard on /v1/internal/…).
    const storedBuf = Buffer.from(entry.token);
    const givenBuf = Buffer.from(token);
    const tokenValid =
      storedBuf.length === givenBuf.length && timingSafeEqual(storedBuf, givenBuf);
    if (!tokenValid) {
      return { found: false, reason: 'invalid-token' };
    }

    // Delete only after successful validation (single-use on success).
    this.entries.delete(id);
    return { found: true, entry };
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  delete(id: string): void {
    this.entries.delete(id);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(id);
      }
    }
  }
}

const officeFileStoreSingleton = new OfficeFileStore();

/** Returns the shared {@link OfficeFileStore} singleton. */
export const getOfficeFileStore = (): OfficeFileStore => officeFileStoreSingleton;