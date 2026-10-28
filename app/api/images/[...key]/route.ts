import { isValidKey, storage } from "@/lib/storage";

// Serves images from local storage. Goes away when storage moves to Vercel Blob.
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });

  try {
    const { data, mimeType } = await storage.read(key);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": mimeType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
