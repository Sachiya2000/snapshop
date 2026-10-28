import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPublishedListing } from "@/lib/store";
import { formatPrice } from "../format";

export default function ProductPage({ params }: PageProps<"/store/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <Link href="/store" className="text-sm text-zinc-500">
        ← All products
      </Link>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        {params.then(({ slug }) => (
          <Product slug={slug} />
        ))}
      </Suspense>
    </main>
  );
}

async function Product({ slug }: { slug: string }) {
  await connection();
  const item = await getPublishedListing(slug);
  if (!item) notFound();

  const [cover, ...others] = item.photos;
  return (
    <article className="flex flex-col gap-4">
      {/* eslint-disable @next/next/no-img-element -- images come from our own API route */}
      <img src={cover} alt={item.title} className="aspect-square w-full rounded-2xl bg-zinc-100 object-cover" />
      {others.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {others.map((src, i) => (
            <img key={src} src={src} alt={`${item.title}, photo ${i + 2}`} className="aspect-square rounded-lg object-cover" />
          ))}
        </div>
      )}
      {/* eslint-enable @next/next/no-img-element */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500">{item.category}</p>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <p className="text-xl font-semibold">{formatPrice(item.priceRange)}</p>
      </div>
      <p className="whitespace-pre-line leading-relaxed">{item.description}</p>
    </article>
  );
}
