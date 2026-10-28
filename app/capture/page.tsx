"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MAX_SIDE = 2000;

// Shrink and re-encode in the browser: keeps uploads under Vercel's body limit
// and turns HEIC (iPhone) into JPEG. createImageBitmap applies EXIF rotation.
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode photo"))), "image/jpeg", 0.88),
  );
}

export default function CapturePage() {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (picked) {
      setError(null);
      setFile(picked);
    }
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("photo", await downscale(file), "photo.jpg");
      const res = await fetch("/api/listing", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      router.push(`/review/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">New product</h1>
        <p className="text-sm text-zinc-500">One photo is enough. We&apos;ll do the rest.</p>
      </header>

      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL
          <img src={preview} alt="Selected product photo" className="h-full w-full object-contain" />
        ) : (
          <p className="px-8 text-center text-zinc-500">Place the product in good light and fill the frame.</p>
        )}
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onPick} />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          disabled={uploading}
          className="rounded-xl bg-zinc-900 py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {file ? "Retake" : "Take photo"}
        </button>
        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          disabled={uploading}
          className="rounded-xl border border-zinc-300 py-3 font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          From gallery
        </button>
      </div>

      {file && (
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Create listing"}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </main>
  );
}
