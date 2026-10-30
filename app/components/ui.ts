// Shared class names, so every page uses the same buttons, cards and inputs.

const button =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export const buttonPrimary = `${button} bg-brand px-5 py-3 text-white shadow-sm shadow-brand/30 hover:bg-brand-strong dark:text-zinc-950`;

export const buttonSecondary = `${button} border border-border bg-surface px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900`;

export const card = "rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.03]";

export const input =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-base transition placeholder:text-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

export const alertError =
  "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200";
