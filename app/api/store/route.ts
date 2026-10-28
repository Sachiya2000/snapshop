import { connection } from "next/server";
import { getPublishedListings } from "@/lib/store";

export async function GET() {
  // Always query at request time; never prerender this at build.
  await connection();
  return Response.json(await getPublishedListings(), { headers: { "Cache-Control": "no-store" } });
}
