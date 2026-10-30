"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertIcon, CameraIcon, CheckIcon, ImageIcon, SparklesIcon, SpinnerIcon } from "../components/icons";
import { alertError, buttonPrimary, buttonSecondary } from "../components/ui";

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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (picked) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(picked));
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
        <h1 className="text-2xl font-bold tracking-tight">New product</h1>
        <p className="mt-1 text-sm text-muted">One photo is enough. We&apos;ll do the rest.</p>
      </header>

      <button
        type="button"
        onClick={() => cameraInput.current?.click()}
        disabled={uploading}
        aria-label={preview ? "Retake photo" : "Take a photo"}
        className={
          "group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl transition " +
          (preview
            ? "border border-border bg-surface shadow-sm"
            : "border-2 border-dashed border-border bg-surface/60 hover:border-brand hover:bg-brand-soft/40")
        }
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
            <img src={preview} alt="Selected product photo" className="h-full w-full animate-fade-in object-contain" />
            {!uploading && (
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                <CameraIcon className="size-3.5" />
                Retake
              </span>
            )}
          </>
        ) : (
          <span className="flex flex-col items-center gap-3 px-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand transition group-hover:scale-105">
              <CameraIcon className="size-8" />
            </span>
            <span className="font-semibold">Tap to take a photo</span>
            <span className="text-sm text-muted">Place the product in good light and fill the frame.</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 font-medium backdrop-blur-sm">
            <SpinnerIcon className="size-8 text-brand" />
            Uploading your photo…
          </span>
        )}
      </button>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onPick} />

      <ul className="flex flex-wrap justify-center gap-2 text-xs text-muted">
        {["Good light", "Plain background", "Product fills the frame"].map((tip) => (
          <li key={tip} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1">
            <CheckIcon className="size-3.5 text-brand" />
            {tip}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => cameraInput.current?.click()} disabled={uploading} className={buttonSecondary}>
          <CameraIcon className="size-4.5" />
          {file ? "Retake" : "Camera"}
        </button>
        <button type="button" onClick={() => galleryInput.current?.click()} disabled={uploading} className={buttonSecondary}>
          <ImageIcon className="size-4.5" />
          Gallery
        </button>
      </div>

      {file && (
        <button type="button" onClick={upload} disabled={uploading} className={`${buttonPrimary} animate-fade-in py-4 text-lg`}>
          {uploading ? <SpinnerIcon /> : <SparklesIcon />}
          {uploading ? "Uploading…" : "Create listing"}
        </button>
      )}

      {error && (
        <p role="alert" className={alertError}>
          <AlertIcon className="mt-px size-4 shrink-0" />
          {error}
        </p>
      )}
    </main>
  );
}
