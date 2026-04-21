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

  get(id: string, token: string): OfficeFileStoreEntry | null {
    this.cleanupExpiredEntries();

    const entry = this.entries.get(id);
    if (!entry || entry.token !== token) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(id);
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