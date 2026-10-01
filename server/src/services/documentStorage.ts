import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

export interface StoredDocument {
  storageKey: string;
}

export interface DocumentStorage {
  save(file: Express.Multer.File): Promise<StoredDocument>;
  open(storageKey: string): Readable;
  remove(storageKey: string): Promise<void>;
}

const storageRoot = path.resolve(
  process.env.DOCUMENT_STORAGE_PATH ?? "server/data/private-documents",
);

class LocalDocumentStorage implements DocumentStorage {
  async save(file: Express.Multer.File): Promise<StoredDocument> {
    const storageKey = randomUUID();
    await mkdir(storageRoot, { recursive: true });
    await writeFile(path.join(storageRoot, storageKey), file.buffer, {
      flag: "wx",
      mode: 0o600,
    });
    return { storageKey };
  }

  open(storageKey: string): Readable {
    return createReadStream(this.resolveKey(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveKey(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private resolveKey(storageKey: string): string {
    if (!/^[0-9a-f-]{36}$/i.test(storageKey)) {
      throw new Error("Invalid document storage key.");
    }
    return path.join(storageRoot, storageKey);
  }
}

export const documentStorage: DocumentStorage = new LocalDocumentStorage();
