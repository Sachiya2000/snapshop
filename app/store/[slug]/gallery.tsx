"use client";

import { useState } from "react";

// Big photo with a row of thumbnails; tapping a thumbnail swaps the big photo.
export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable @next/next/no-img-element -- images come from our own API route */}
      <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-surface">
        <img key={photos[active]} src={photos[active]} alt={title} className="size-full animate-fade-in object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === active}
              className={
                "overflow-hidden rounded-xl transition " +
                (i === active ? "ring-2 ring-brand" : "opacity-60 ring-1 ring-border hover:opacity-100")
              }
            >
              <img src={src} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
