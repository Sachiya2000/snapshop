# SnapShop

One phone photo in, a ready-to-sell online listing out.

A shop owner snaps a product photo. SnapShop then:

1. **Segments** the product and removes the background with **SAM 3.1**.
2. **Generates** clean studio-style product photos with **Muse Image**.
3. **Writes** the title, description, category, and a suggested price range with **Muse Spark** (English for now; Sinhala is planned once its output quality is reliable).
4. **Checks** the result with an agent loop that retries or fixes weak output *(planned)*.
5. Lets the owner **review, edit, and publish** to a public storefront *(planned)*.

All AI calls go through the [Meta Model API](https://dev.meta.ai/docs/models) and run only on the server.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL on [Neon](https://neon.tech) via Prisma 7 (`@prisma/adapter-pg`)
- Meta Model API through the OpenAI SDK (`baseURL: https://api.meta.ai/v1`), as the Meta quickstart recommends
- `@meta-sam/parser` to decode SAM masks, `sharp` for the cutout

## How the pipeline runs

Each upload creates a `ListingJob` row. The work is split into short steps
(`queued → segmenting → imaging → writing → review`), and each step runs in
its own function invocation:

- `POST /api/listing` stores the photo, creates the job, and starts the first step with `after()`.
- `GET /api/listing/:id` returns the status. If the job is idle (or its step lock is stale), it starts the next step with `after()`.

The capture page polls every 2 seconds, so polling is what drives the
pipeline. No single request has to wait for the whole job, and a crashed step
is picked up again once its lock expires. A job only moves forward while
someone is polling it.

## Project layout

```
app/capture          mobile photo capture + upload
app/review/[id]      job status (edit form comes later)
app/store            public storefront (placeholder)
app/api/listing      create job, poll status
app/api/images       serves locally stored images
lib/meta             typed Meta Model API wrappers (SAM, Muse Image, Muse Spark)
lib/pipeline         one file per pipeline step + the runner
lib/storage.ts       image storage interface (local disk now, Vercel Blob later)
prisma/              database schema
scripts/verify-meta  checks your API key and each model against a sample photo
```

## Setup

Requirements: Node.js 20.17+ (or 22.9+), a Meta Model API key, and a Neon database.

```bash
npm install
cp .env.example .env.local   # then fill in MODEL_API_KEY and DATABASE_URL
npx prisma migrate dev       # creates the tables in your Neon database
npm run dev                  # http://localhost:3000/capture
```

To test on a phone on the same Wi-Fi, open `http://<your-computer-ip>:3000/capture`.

### Check your Meta API key and models

```bash
npm run verify:meta -- path/to/product-photo.jpg
```

This lists your available models and calls each wrapper once: subject detection, SAM 3.1 segmentation, Muse Image (3 images, about $0.03), and Muse Spark. Results are written to `scripts/output/`. To run only some steps, pass `--steps=models,subject,sam,listing`.

## Security

- `MODEL_API_KEY` is read only by server code (`lib/meta`) and has no `NEXT_PUBLIC_` prefix, so Next.js never sends it to the browser.
- `.env*` files are git-ignored. Only `.env.example` (with no values) is committed.

## Built during the hackathon

SnapShop is being built for the **Meta Global AI Developer Hackathon**
(build period Oct 27 – Nov 4, 2026). The project started on **Oct 28, 2026**,
and all code in this repository was written during the hackathon. The commit
history shows the day-by-day progress.
