import { randomBytes, randomUUID } from 'node:crypto';

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
   * Retrieves and immediately removes the entry (single-use).
   * This ensures that a token leaked via proxy logs cannot be replayed
   * once ONLYOFFICE has successfully fetched the file.
   */
  get(id: string, token: string): OfficeFileStoreEntry | null {
    this.cleanupExpiredEntries();

    const entry = this.entries.get(id);

    // Always delete on lookup to enforce single-use semantics.
    this.entries.delete(id);

    if (!entry || entry.token !== token) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      return null;
    }

    return entry;
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

export const createOfficeFileStore = (): OfficeFileStore => officeFileStoreSingleton;