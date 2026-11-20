import OpenAI from "openai";

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY (see .env.example)");
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// GPT-6 family: astra (strongest), sol (everyday), luna (cheapest, fastest). Override in .env.
export const MODEL_FAST = process.env.OPENAI_MODEL_FAST || "gpt-6-luna";
export const MODEL_AGENT = process.env.OPENAI_MODEL_AGENT || "gpt-6-luna";

type InputContent =
  | { type: "input_text"; text: string }
  | { type: "input_file"; filename: string; file_data: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

/**
 * One cheap structured-output call (JSON schema, strict). Returns the parsed object.
 * `content` can mix text with a PDF or image (base64 data URLs).
 */
export async function structured<T>(opts: {
  name: string;
  schema: Record<string, unknown>;
  instructions: string;
  content: InputContent[];
  model?: string;
}): Promise<T> {
  const res = await openai().responses.create({
    model: opts.model ?? MODEL_FAST,
    instructions: opts.instructions,
    input: [{ role: "user", content: opts.content }],
    text: { format: { type: "json_schema", name: opts.name, schema: opts.schema, strict: true } },
  } as Parameters<OpenAI["responses"]["create"]>[0]);
  const text = (res as { output_text?: string }).output_text ?? "";
  return JSON.parse(text) as T;
}

export function fileToContent(filename: string, mime: string, bytes: ArrayBuffer): InputContent {
  const b64 = Buffer.from(bytes).toString("base64");
  if (mime.startsWith("image/")) {
    return { type: "input_image", image_url: `data:${mime};base64,${b64}`, detail: "auto" };
  }
  return { type: "input_file", filename, file_data: `data:${mime || "application/pdf"};base64,${b64}` };
}
