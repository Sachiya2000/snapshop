import Link from "next/link";
import { ArrowRightIcon, CameraIcon, CheckIcon, SparklesIcon } from "./components/icons";
import { buttonPrimary, buttonSecondary, card } from "./components/ui";

const STEPS = [
  {
    icon: CameraIcon,
    title: "Snap one photo",
    body: "Take a picture of your product with your phone. Any background works.",
  },
  {
    icon: SparklesIcon,
    title: "AI builds the listing",
    body: "We cut out the product, create studio photos, write the text and suggest a price.",
  },
  {
    icon: CheckIcon,
    title: "Review and publish",
    body: "Check the details, make any changes, and it goes live in your store.",
  },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-300/40 via-teal-200/30 to-sky-200/20 blur-3xl dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-sky-500/5"
      />

      <section className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-14 pb-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
          <SparklesIcon className="size-3.5 text-brand" />
          Powered by Meta AI: SAM 3.1, Muse Image and Muse Spark
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Snap a photo.{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
            Start selling.
          </span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-pretty text-muted">
          One photo of your product becomes a ready-to-sell listing with studio photos, a description and a price, in
          about a minute.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/capture" className={`${buttonPrimary} py-4 text-lg sm:px-7`}>
            <CameraIcon />
            Add a product
          </Link>
          <Link href="/store" className={`${buttonSecondary} py-4 text-lg sm:px-7`}>
            Browse the store
            <ArrowRightIcon className="size-4.5" />
          </Link>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-4 pb-16">
        <h2 className="mb-4 text-center text-sm font-semibold tracking-wide text-muted uppercase">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className={`${card} flex flex-col gap-3 p-5`}>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon />
                </span>
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
