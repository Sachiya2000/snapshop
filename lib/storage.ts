import { get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const EXT: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Storage keys look like "original/<uuid>.jpg". Anything else is rejected,
// which also blocks path traversal.
const KEY_RE = /^(original|cutout|studio)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export type ImageKind = "original" | "cutout" | "studio";

export interface ImageStorage {
  save(kind: ImageKind, data: Buffer, mimeType: ImageMimeType): Promise<string>;
  read(key: string): Promise<{ data: Buffer; mimeType: ImageMimeType }>;
  publicUrl(key: string): string;
}

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

function mimeFromKey(key: string): ImageMimeType {
  const ext = key.split(".").pop();
  const entry = Object.entries(EXT).find(([, e]) => e === ext);
  if (!entry) throw new Error(`unknown image extension: ${key}`);
  return entry[0] as ImageMimeType;
}

function newKey(kind: ImageKind, mimeType: ImageMimeType): string {
  return `${kind}/${randomUUID()}.${EXT[mimeType]}`;
}

// Images are always served through /api/images, whichever driver holds them,
// so URLs stored in listings stay valid if the driver changes.
function publicUrl(key: string): string {
  return `/api/images/${key}`;
}

// Local disk under ./uploads. Fine for dev; Vercel's filesystem is read-only
// and ephemeral, so production uses BlobStorage instead.
class LocalDiskStorage implements ImageStorage {
  constructor(private root = path.join(process.cwd(), "uploads")) {}

  async save(kind: ImageKind, data: Buffer, mimeType: ImageMimeType): Promise<string> {
    const key = newKey(kind, mimeType);
    const file = path.join(this.root, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return key;
  }

  async read(key: string) {
    if (!isValidKey(key)) throw new Error(`invalid storage key: ${key}`);
    const data = await readFile(path.join(this.root, key));
    return { data, mimeType: mimeFromKey(key) };
  }

  publicUrl = publicUrl;
}

// Vercel Blob in a private store: customer photos are never directly
// listable, and reads go through our own route. Auth comes from
// BLOB_READ_WRITE_TOKEN, or Vercel OIDC with BLOB_STORE_ID.
class BlobStorage implements ImageStorage {
  async save(kind: ImageKind, data: Buffer, mimeType: ImageMimeType): Promise<string> {
    const key = newKey(kind, mimeType);
    await put(key, data, { access: "private", contentType: mimeType, addRandomSuffix: false });
    return key;
  }

  async read(key: string) {
    if (!isValidKey(key)) throw new Error(`invalid storage key: ${key}`);
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) throw new Error(`image not found: ${key}`);
    const data = Buffer.from(await new Response(result.stream).arrayBuffer());
    return { data, mimeType: mimeFromKey(key) };
  }

  publicUrl = publicUrl;
}

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
export const storage: ImageStorage = useBlob ? new BlobStorage() : new LocalDiskStorage();
