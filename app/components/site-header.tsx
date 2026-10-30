import Link from "next/link";
import { BagIcon, PlusIcon } from "./icons";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <BagIcon className="size-4.5" />
          </span>
          SnapShop
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/store" className="rounded-lg px-3 py-2 font-medium text-muted transition hover:text-foreground">
            Store
          </Link>
          <Link
            href="/capture"
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 font-semibold text-background transition hover:opacity-90"
          >
            <PlusIcon className="size-4" />
            New
          </Link>
        </nav>
      </div>
    </header>
  );
}
