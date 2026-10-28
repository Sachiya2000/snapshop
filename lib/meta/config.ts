// Model IDs and endpoints from https://dev.meta.ai/docs/models
export const META_BASE_URL = "https://api.meta.ai/v1";

export const MODELS = {
  spark: process.env.META_SPARK_MODEL ?? "muse-spark-1.3",
  image: "muse-image-1.0",
  sam: "sam-3.1",
} as const;

// Per-call timeouts (ms). Image generation is the slowest step.
export const TIMEOUTS = {
  spark: 90_000,
  sam: 60_000,
  image: 180_000,
} as const;
