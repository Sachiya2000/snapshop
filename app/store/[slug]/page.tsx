import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPublishedListing } from "@/lib/store";
import { ArrowLeftIcon, SparklesIcon } from "../../components/icons";
import { formatPrice } from "../format";
import { Gallery } from "./gallery";

export default function ProductPage({ params }: PageProps<"/store/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
      <Link
        href="/store"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        All products
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
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

  return (
    <article className="grid animate-fade-in gap-6 md:grid-cols-2 md:gap-10">
      <Gallery photos={item.photos} title={item.title} />
      <div className="flex flex-col gap-4 md:py-2">
        <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
          {item.category}
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{item.title}</h1>
        <p className="text-2xl font-semibold text-brand-strong">{formatPrice(item.priceRange)}</p>
        <hr className="border-border" />
        <p className="leading-relaxed whitespace-pre-line text-foreground/85">{item.description}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <SparklesIcon className="size-3.5" />
          Listed with SnapShop from a single photo
        </p>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div aria-label="Loading product" className="grid gap-6 md:grid-cols-2 md:gap-10">
      <div className="aspect-square animate-pulse rounded-3xl bg-zinc-200/70 dark:bg-zinc-800/70" />
      <div className="flex flex-col gap-4 md:py-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-8 w-4/5 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-7 w-1/3 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-24 w-full animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
      </div>
    </div>
  );
}
