import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-4xl font-bold">SnapShop</h1>
        <p className="mt-2 text-lg text-zinc-500">
          One photo of your product becomes a ready-to-sell listing.
        </p>
      </div>
      <Link
        href="/capture"
        className="rounded-xl bg-emerald-600 py-4 text-center text-lg font-semibold text-white"
      >
        Add a product
      </Link>
      <Link href="/store" className="text-center text-zinc-500 underline">
        View store
      </Link>
    </main>
  );
}
