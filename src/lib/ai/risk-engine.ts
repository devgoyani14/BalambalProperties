import OpenAI from "openai";
import { isBedrockConfigured } from "./bedrock-client";
import { runRiskAssessmentWithBedrock } from "./risk-engine-bedrock";
import type { RiskRubricResult } from "@/types";

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

function useBedrockRiskAssessment(): boolean {
  const enabled =
    process.env.BEDROCK_RISK_ASSESSMENT_ENABLED === "true" ||
    process.env.BEDROCK_RISK_ASSESSMENT_ENABLED === "1";
  return enabled && isBedrockConfigured();
}

interface PropertyContext {
  title: string;
  description: string;
  district: string;
  propertyType: string;
  floor: string | null;
  features: Record<string, unknown> | null;
  evidencePack: {
    ubwStatus: string;
    ubwDetail: string | null;
    buildingRecordStatus: string;
  } | null;
}

const FNB_CHECKS = [
  "ventilation_exhaust",
  "fire_safety",
  "fehd_licensing",
  "ubw_impact",
] as const;

const RETAIL_CHECKS = [
  "signage_shopfront",
  "planning_compliance",
  "accessibility",
] as const;

const WAREHOUSE_CHECKS = [
  "loading_bay",
  "goods_lift",
  "fire_compartment",
  "dangerous_goods",
] as const;

const SYSTEM_PROMPT = `You are a Hong Kong commercial property compliance expert. Assess a property's fitness for a specific business use.

For each check, return:
- status: "pass" (likely compliant), "fail" (likely non-compliant), "risk" (potential issues needing investigation), or "unknown" (insufficient data)
- confidence: 0-1 score
- explanation: plain-language explanation (1-2 sentences)
- recommendation: specific next action for the user
- sources: relevant government URLs if applicable

Government references:
- FEHD licensing: https://www.fehd.gov.hk/english/licensing/guide.html
- FSD fire safety: https://www.hkfsd.gov.hk/eng/source/licensing/
- Buildings Department BRAVO: https://bravo.bd.gov.hk/
- Land Registry: https://www.landreg.gov.hk/

Be conservative. When data is insufficient, use "unknown" or "risk" rather than "pass". Always recommend professional verification.

Return a JSON array of check results.`;

export async function runRiskAssessment(
  sectorType: string,
  property: PropertyContext
): Promise<RiskRubricResult[]> {
  let checks: readonly string[];
  switch (sectorType) {
    case "fnb":
      checks = FNB_CHECKS;
      break;
    case "retail":
      checks = RETAIL_CHECKS;
      break;
    case "warehouse":
      checks = WAREHOUSE_CHECKS;
      break;
    default:
      return [];
  }

  const propertyInfo = `
Property: ${property.title}
District: ${property.district}
Type: ${property.propertyType}
Floor: ${property.floor || "Unknown"}
Description: ${property.description}
Features: ${property.features ? JSON.stringify(property.features) : "None available"}
UBW Status: ${property.evidencePack?.ubwStatus || "Unknown"}
UBW Detail: ${property.evidencePack?.ubwDetail || "None"}
Building Record: ${property.evidencePack?.buildingRecordStatus || "Unknown"}
`;

  if (useBedrockRiskAssessment()) {
    try {
      return await runRiskAssessmentWithBedrock(sectorType, property);
    } catch (error) {
      console.error("Bedrock risk assessment error:", error);
      return checks.map((checkName) => ({
        checkName,
        status: "unknown" as const,
        confidence: 0,
        explanation: "Bedrock assessment failed. Try again or use professional verification.",
        recommendation: "Consult a qualified professional for compliance verification.",
        sources: [],
      }));
    }
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "MiniMax-Text-01",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n\nIMPORTANT: Respond ONLY with a valid JSON object. No markdown, no explanation, just raw JSON." },
        {
          role: "user",
          content: `Assess this property for ${sectorType.toUpperCase()} use. Run these checks: ${checks.join(", ")}.

${propertyInfo}

Return JSON: { "results": [{ "checkName": string, "status": "pass"|"fail"|"risk"|"unknown", "confidence": number, "explanation": string, "recommendation": string, "sources": string[] }] }`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    let content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(content);
    return (parsed.results || []).map((r: RiskRubricResult) => ({
      checkName: r.checkName,
      status: r.status,
      confidence: Math.max(0, Math.min(1, r.confidence)),
      explanation: r.explanation,
      recommendation: r.recommendation,
      sources: r.sources || [],
    }));
  } catch (error) {
    console.error("Risk assessment error:", error);
    return checks.map((checkName) => ({
      checkName,
      status: "unknown" as const,
      confidence: 0,
      explanation: "Unable to perform assessment. AI service unavailable.",
      recommendation: "Consult a qualified professional for compliance verification.",
      sources: [],
    }));
  }
}
