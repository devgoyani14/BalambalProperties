import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";

const DEFAULT_MODEL = "anthropic.claude-3-5-sonnet-v2:0";
const DEFAULT_REGION = "us-east-1";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    const region = process.env.AWS_REGION ?? DEFAULT_REGION;
    client = new BedrockRuntimeClient({
      region,
      ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  }
  return client;
}

export interface BedrockConverseOptions {
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Invoke a Bedrock model via the Converse API.
 * Uses system prompt + single user message and returns the assistant text response.
 */
export async function bedrockConverse(
  systemPrompt: string,
  userMessage: string,
  options: BedrockConverseOptions = {}
): Promise<string> {
  const modelId = options.modelId ?? process.env.BEDROCK_MODEL_ID ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 4096;
  const temperature = options.temperature ?? 0.2;

  const command = new ConverseCommand({
    modelId,
    system: [{ text: systemPrompt }],
    messages: [
      {
        role: "user",
        content: [{ text: userMessage }],
      },
    ] as Message[],
    inferenceConfig: {
      maxTokens,
      temperature,
    },
  });

  const response = await getClient().send(command);
  const output = response.output;

  if (!output?.message?.content) {
    throw new Error("Bedrock returned no content");
  }

  const parts: string[] = [];
  for (const block of output.message.content as ContentBlock[]) {
    if (block.text) {
      parts.push(block.text);
    }
  }
  return parts.join("");
}

export function isBedrockConfigured(): boolean {
  const region = process.env.AWS_REGION;
  const hasExplicitCreds =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  return Boolean(region || hasExplicitCreds);
}
