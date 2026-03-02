import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: "https://api.minimaxi.chat/v1",
    });
  }
  return _openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "embo-01",
    input: text,
  });
  return response.data[0].embedding;
}

export function buildPropertyEmbeddingText(property: {
  title: string;
  description: string;
  district: string;
  propertyType: string;
  address: string;
  floor?: string | null;
  saleableArea?: number | null;
}): string {
  const parts = [
    property.title,
    property.description,
    `District: ${property.district}`,
    `Type: ${property.propertyType}`,
    `Address: ${property.address}`,
  ];

  if (property.floor) parts.push(`Floor: ${property.floor}`);
  if (property.saleableArea) parts.push(`Area: ${property.saleableArea} sq ft`);

  return parts.join(". ");
}

export async function describeImage(dataUrl: string): Promise<string> {
  try {
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");

    const prompt = `Describe this image as a Hong Kong commercial property search. It may be a mood board, inspiration photo, floor plan, or interior shot.

Output a natural language search description that includes:
- Property type: retail, fnb, office, warehouse, or industrial (e.g. "modern office", "cafe space", "street-level retail")
- Hong Kong district feel if evident (e.g. Central, Wan Chai, Mong Kok, Tsim Sha Tsui, Sheung Wan)
- Layout and size hints (open plan, small shop, large warehouse)
- Style or aesthetic (minimalist, industrial, premium, casual)
- Commercial use indicators (exhaust for F&B, loading dock, high ceiling)

Write 1-3 sentences that could be used to search for similar commercial spaces.

[Image base64:${base64Data}]`;

    const response = await getOpenAI().chat.completions.create({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Image description error:", error);
    return "";
  }
}
