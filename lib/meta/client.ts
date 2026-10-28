import OpenAI from "openai";
import { META_BASE_URL } from "./config";

// The API key must never reach the browser. Next.js only inlines NEXT_PUBLIC_
// vars into client bundles, and this guard catches accidental client imports.
if (typeof window !== "undefined") {
  throw new Error("lib/meta is server-only");
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly status?: number,
    readonly code?: string,
    // True for timeouts, rate limits and 5xx. Content-safety blocks are 400s.
    readonly retryable = false,
  ) {
    super(`[${operation}] ${message}`);
    this.name = "MetaApiError";
  }
}

let client: OpenAI | undefined;

// The Meta quickstart recommends the OpenAI SDK pointed at the Model API.
// The SDK retries 408/409/429/5xx with backoff on its own.
export function getMetaClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) throw new MetaApiError("MODEL_API_KEY is not set", "config");
    client = new OpenAI({ baseURL: META_BASE_URL, apiKey, maxRetries: 2 });
  }
  return client;
}

export async function callMeta<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toMetaError(operation, err);
  }
}

function toMetaError(operation: string, err: unknown): MetaApiError {
  if (err instanceof MetaApiError) return err;
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return new MetaApiError("request timed out", operation, undefined, "timeout", true);
  }
  if (err instanceof OpenAI.APIError) {
    const status = err.status;
    const retryable = status === undefined || status === 429 || status >= 500;
    return new MetaApiError(err.message, operation, status, err.code ?? undefined, retryable);
  }
  const message = err instanceof Error ? err.message : String(err);
  return new MetaApiError(message, operation);
}

export function toDataUrl(data: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${data.toString("base64")}`;
}
