import OpenAI from "openai";
import { MODELS, TIMEOUTS } from "./config";
import { MetaApiError, callMeta, getMetaClient } from "./client";

export interface StructuredRequest {
  // Schema name: a-z, A-Z, 0-9, _ and -, up to 64 chars.
  name: string;
  instructions: string;
  prompt: string;
  imageDataUrl?: string;
  // JSON Schema for strict mode: every property required, additionalProperties false.
  schema: Record<string, unknown>;
}

// Anything that can look at an image and return JSON matching a schema.
// Swap via LISTING_PROVIDER without touching the callers.
export interface TextProvider {
  readonly id: string;
  readonly model: string;
  generateJson(req: StructuredRequest): Promise<unknown>;
}

// Muse Spark on the Model API, via POST /v1/responses with text.format.
// https://dev.meta.ai/docs/api-reference/responses/schemas
class MetaSparkProvider implements TextProvider {
  readonly id = "meta";
  readonly model = MODELS.spark;

  async generateJson(req: StructuredRequest): Promise<unknown> {
    const content: Record<string, string>[] = [{ type: "input_text", text: req.prompt }];
    if (req.imageDataUrl) content.push({ type: "input_image", image_url: req.imageDataUrl });

    const res = await callMeta(`spark:${req.name}`, () =>
      getMetaClient().responses.create(
        {
          model: this.model,
          instructions: req.instructions,
          // Cast: the SDK types require `detail` on input_image, which the Meta docs don't define.
          input: [{ type: "message", role: "user", content }] as unknown as OpenAI.Responses.ResponseInput,
          text: { format: { type: "json_schema", name: req.name, schema: req.schema, strict: true } },
          reasoning: { effort: "low" },
          max_output_tokens: 4000,
          store: false,
        },
        { timeout: TIMEOUTS.spark },
      ),
    );

    if (res.status !== "completed") {
      throw new MetaApiError(`response ${res.status}`, `spark:${req.name}`, undefined, undefined, true);
    }
    return parseJson(res.output_text, `spark:${req.name}`);
  }
}

// Any OpenAI-compatible Chat Completions server, e.g. Muse Spark Open behind
// vLLM. Not yet tested against a real deployment.
class OpenAICompatibleProvider implements TextProvider {
  readonly id = "openai-compatible";
  private client: OpenAI;

  constructor(
    baseURL: string,
    readonly model: string,
    apiKey: string,
  ) {
    this.client = new OpenAI({ baseURL, apiKey, maxRetries: 2 });
  }

  async generateJson(req: StructuredRequest): Promise<unknown> {
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: req.prompt }];
    if (req.imageDataUrl) userContent.push({ type: "image_url", image_url: { url: req.imageDataUrl } });

    const res = await callMeta(`open:${req.name}`, () =>
      this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: "system", content: req.instructions },
            { role: "user", content: userContent },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: req.name, schema: req.schema, strict: true },
          },
        },
        { timeout: TIMEOUTS.spark },
      ),
    );
    return parseJson(res.choices[0]?.message.content ?? "", `open:${req.name}`);
  }
}

function parseJson(text: string, operation: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new MetaApiError(`model returned invalid JSON: ${text.slice(0, 200)}`, operation, undefined, undefined, true);
  }
}

let provider: TextProvider | undefined;

export function getTextProvider(): TextProvider {
  if (provider) return provider;
  const kind = process.env.LISTING_PROVIDER ?? "meta";
  if (kind === "meta") {
    provider = new MetaSparkProvider();
  } else if (kind === "openai-compatible") {
    const { OPEN_MODEL_BASE_URL, OPEN_MODEL_NAME, OPEN_MODEL_API_KEY } = process.env;
    if (!OPEN_MODEL_BASE_URL || !OPEN_MODEL_NAME) {
      throw new MetaApiError("OPEN_MODEL_BASE_URL and OPEN_MODEL_NAME are required", "config");
    }
    provider = new OpenAICompatibleProvider(OPEN_MODEL_BASE_URL, OPEN_MODEL_NAME, OPEN_MODEL_API_KEY ?? "none");
  } else {
    throw new MetaApiError(`unknown LISTING_PROVIDER "${kind}"`, "config");
  }
  return provider;
}
