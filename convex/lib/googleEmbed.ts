/** Google Generative Language embedContent helper (Convex actions). */

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const DEFAULT_MODELS = ["gemini-embedding-001", "text-embedding-004"];

function truncateForLog(value: string, max = 300): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function resolveEmbeddingModelCandidates(configuredModel?: string): string[] {
  const fromEnv = (configuredModel ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  return Array.from(new Set([...fromEnv, ...DEFAULT_MODELS]));
}

export function l2Normalize(vector: number[]): number[] {
  let sumSquares = 0;
  for (const n of vector) {
    sumSquares += n * n;
  }
  const mag = Math.sqrt(sumSquares);
  if (mag === 0) return vector;
  return vector.map((n) => n / mag);
}

export function fitEmbeddingDimensions(
  values: number[],
  dimensions: number,
): number[] {
  if (values.length === dimensions) return values;
  if (values.length > dimensions) {
    return l2Normalize(values.slice(0, dimensions));
  }
  throw new Error(
    `Embedding dimension ${values.length} is smaller than required ${dimensions}`,
  );
}

async function embedOnce(
  model: string,
  apiKey: string,
  text: string,
  taskType: EmbedTaskType,
  outputDimensionality?: number,
): Promise<number[]> {
  const body: Record<string, unknown> = {
    content: { parts: [{ text }] },
    taskType,
  };
  if (outputDimensionality != null) {
    body.outputDimensionality = outputDimensionality;
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const errBody = truncateForLog(await response.text());
    throw new Error(
      `Google embedding request failed: ${response.status} ${response.statusText} ${errBody}`,
    );
  }
  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const values = data.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Google embedding response missing vector values");
  }
  return values;
}

export async function embedTextWithGoogle(args: {
  text: string;
  apiKey: string;
  taskType: EmbedTaskType;
  dimensions: number;
  configuredModel?: string;
}): Promise<number[]> {
  const models = resolveEmbeddingModelCandidates(args.configuredModel);
  let lastError: Error | undefined;
  for (const model of models) {
    try {
      const values = await embedOnce(
        model,
        args.apiKey,
        args.text,
        args.taskType,
        args.dimensions,
      );
      return fitEmbeddingDimensions(values, args.dimensions);
    } catch (first) {
      lastError = first instanceof Error ? first : new Error(String(first));
      try {
        const values = await embedOnce(
          model,
          args.apiKey,
          args.text,
          args.taskType,
        );
        return fitEmbeddingDimensions(values, args.dimensions);
      } catch (second) {
        lastError = second instanceof Error ? second : new Error(String(second));
      }
    }
  }
  throw lastError ?? new Error("Google embedding request failed");
}
