import { NextRequest, NextResponse } from "next/server";
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

const SYSTEM_PROMPT = `You are a Hong Kong commercial real estate advisor chatbot embedded in a property search platform called BalaOne.

YOUR ROLE: Have a natural conversation to understand what the user needs, then output structured filters so the platform can search for matching properties.

CONVERSATION APPROACH:
- Ask ONE question at a time to progressively understand the user's needs
- Be conversational and natural, not robotic — like a friendly property agent
- If the user gives a vague or irrelevant answer, gently redirect: "I want to help you find the right space — could you tell me what kind of business you're running or what type of property you need?"
- If the user gives nonsense, swears, or gibberish, stay friendly: "No worries! Let me know when you're ready to search. Just tell me what kind of space you're after."
- You should aim to learn these things (in roughly this order, but be flexible):
  1. Property type (office, retail/shop, F&B/restaurant, warehouse, industrial, coworking)
  2. Preferred area/district in Hong Kong
  3. Monthly budget range (HKD)
  4. Size/floor area (sqft)
  5. TARGETED FOLLOW-UPS — ask these when relevant:
     - MTR proximity: "How close do you need to be to the MTR? Within 5 min walk, or is 10 min okay?"
     - Renovation: "Are you open to renovating, or do you need something ready to move in?"
     - Business-specific: For F&B — exhaust/ventilation; for retail — foot traffic, frontage; for office — capacity, building grade
     - Timeline: "When do you need to move in?"
- Once you have enough info to search (at minimum: property type OR district), include a filters block
- You do NOT need all pieces — if the user is eager to search, let them
- If properties are provided in the context, reference them by name when relevant

HONG KONG KNOWLEDGE:
- Districts: Central, Wan Chai, Causeway Bay, North Point, Quarry Bay, Tai Koo, Sheung Wan, Sai Ying Pun, Kennedy Town, Aberdeen, Tsim Sha Tsui, Mong Kok, Yau Ma Tei, Jordan, Sham Shui Po, Cheung Sha Wan, Lai Chi Kok, Kwun Tong, Kwai Chung, Tsuen Wan, Tuen Mun, Yuen Long, Sha Tin, Fo Tan, Tai Po, Fanling
- Property types: retail, fnb, office, warehouse, industrial
- F&B requires exhaust/ventilation — always flag this
- "shop" = retail, "restaurant/cafe/kitchen/food" = fnb, "godown/storage" = warehouse
- Rents are in HKD per month

RESPONSE FORMAT — you MUST always respond with a JSON object like this:
{
  "message": "Your conversational reply to the user",
  "filters": null | {
    "districts": string[] | null,
    "propertyTypes": string[] | null,
    "minRent": number | null,
    "maxRent": number | null,
    "minArea": number | null,
    "maxArea": number | null,
    "nearMtrMaxMinutes": number | null,
    "willingToRenovate": boolean | null,
    "businessType": string | null
  },
  "suggestedChips": ["chip 1", "chip 2", "chip 3"]
}

- "message": Your natural language response. Keep it concise (1-3 sentences).
- "filters": null if you don't have enough info yet to search. Include filters as soon as you can extract meaningful search criteria. Merge with any existing filters from context.
- "nearMtrMaxMinutes": e.g. 5 for "within 5 min walk to MTR", 10 for "within 10 min"
- "willingToRenovate": true if user will renovate, false if needs move-in ready
- "businessType": e.g. "F&B", "retail", "office" for business-specific requirements
- "suggestedChips": 2-4 short reply suggestions the user can tap. Make them relevant to what you just asked. Keep under 5 words each.

CRITICAL RULES:
1. You MUST respond with ONLY a valid JSON object — nothing before or after it.
2. Never respond with plain text. Always use the JSON format above.
3. Start your response with { and end with }
4. No markdown fences, no explanation outside JSON.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PropertySummary {
  id: string;
  title: string;
  district: string;
  propertyType: string;
  monthlyRent: number | null;
  saleableArea: number | null;
  floor: string | null;
}

interface ChatContext {
  currentFilters?: {
    districts?: string[];
    types?: string[];
    propertyTypes?: string[];
    minRent?: number;
    maxRent?: number;
    minArea?: number;
    maxArea?: number;
    nearMtrMaxMinutes?: number;
    willingToRenovate?: boolean;
    businessType?: string;
  };
  resultCount?: number;
  propertySummaries?: PropertySummary[];
}

function buildContextBlock(context?: ChatContext): string {
  if (!context) return "";
  const parts: string[] = ["\n[CURRENT SEARCH CONTEXT]"];
  if (context.currentFilters) {
    const f = context.currentFilters;
    const types = f.types ?? f.propertyTypes ?? [];
    const active: string[] = [];
    if (f.districts?.length) active.push(`Districts: ${f.districts.join(", ")}`);
    if (types.length) active.push(`Types: ${types.join(", ")}`);
    if (f.minRent || f.maxRent) active.push(`Budget: HK$${f.minRent ?? 0}–${f.maxRent ?? "any"}/mo`);
    if (f.minArea || f.maxArea) active.push(`Area: ${f.minArea ?? "any"}–${f.maxArea ?? "any"} sqft`);
    if (f.nearMtrMaxMinutes) active.push(`MTR: within ${f.nearMtrMaxMinutes} min walk`);
    if (f.willingToRenovate === false) active.push("Needs move-in ready");
    if (f.willingToRenovate === true) active.push("Open to renovate");
    if (f.businessType) active.push(`Business: ${f.businessType}`);
    if (active.length) parts.push(active.join(" | "));
  }
  if (context.resultCount != null) parts.push(`Currently showing: ${context.resultCount} properties`);
  if (context.propertySummaries?.length) {
    parts.push("\n[AVAILABLE PROPERTIES]");
    context.propertySummaries.forEach((p, i) => {
      const rent = p.monthlyRent ? `HK$${p.monthlyRent.toLocaleString()}/mo` : "—";
      const area = p.saleableArea ? `${p.saleableArea} sqft` : "—";
      parts.push(`${i + 1}. ${p.title} | ${p.district} | ${p.propertyType} | ${rent} | ${area} | Floor: ${p.floor || "—"}`);
    });
  }
  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context }: { messages: ChatMessage[]; context?: ChatContext } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    if (!process.env.MINIMAX_API_KEY) {
      return NextResponse.json({
        message: "AI is not configured. Please use the filters on the left to search.",
        filters: null,
        suggestedChips: ["Use filters instead"],
      });
    }

    const contextBlock = buildContextBlock(context);
    const systemContent = SYSTEM_PROMPT + (contextBlock ? "\n" + contextBlock : "");

    const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (i === messages.length - 1 && msg.role === "user") {
        apiMessages.push({
          role: "user",
          content: msg.content + "\n\n[Respond with JSON only: {\"message\": \"...\", \"filters\": ..., \"suggestedChips\": [...]}]",
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await getOpenAI().chat.completions.create({
      model: "MiniMax-Text-01",
      messages: apiMessages,
      temperature: 0.4,
      max_tokens: 500,
    });

    let content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    // Try to extract JSON — the model sometimes wraps it in markdown or mixes plain text
    content = content.trim();
    let parsed: { message?: string; filters?: Record<string, unknown>; suggestedChips?: string[] } | null = null;

    // Attempt 1: direct parse
    try {
      parsed = JSON.parse(content);
    } catch {
      // Attempt 2: strip markdown fences
      const stripped = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        // Attempt 3: find first { ... } block in the text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // give up on JSON
          }
        }
      }
    }

    // If we got valid JSON with a message field, use it
    if (parsed && typeof parsed.message === "string") {
      return NextResponse.json({
        message: parsed.message,
        filters: parsed.filters || null,
        suggestedChips: parsed.suggestedChips || [],
      });
    }

    // Model returned plain text — use it directly as the message
    return NextResponse.json({
      message: content.slice(0, 500),
      filters: null,
      suggestedChips: [],
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({
      message: "Something went wrong — could you try that again?",
      filters: null,
      suggestedChips: ["Office", "Retail / Shop", "F&B / Restaurant", "Warehouse"],
    });
  }
}
