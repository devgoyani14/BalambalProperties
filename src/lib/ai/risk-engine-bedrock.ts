import { bedrockConverse } from "./bedrock-client";
import type { RiskRubricResult } from "@/types";

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

Respond ONLY with a valid JSON object. No markdown, no explanation, no code fence, just raw JSON.`;

function buildUserPrompt(
  sectorType: string,
  checks: readonly string[],
  property: PropertyContext
): string {
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
  return `Assess this property for ${sectorType.toUpperCase()} use. Run these checks: ${checks.join(", ")}.
${propertyInfo}
Return JSON: { "results": [{ "checkName": string, "status": "pass"|"fail"|"risk"|"unknown", "confidence": number, "explanation": string, "recommendation": string, "sources": string[] }] }`;
}

export async function runRiskAssessmentWithBedrock(
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

  const raw = await bedrockConverse(
    SYSTEM_PROMPT,
    buildUserPrompt(sectorType, checks, property),
    { maxTokens: 1500, temperature: 0.2 }
  );

  const content = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(content);
  return (parsed.results || []).map((r: RiskRubricResult) => ({
    checkName: r.checkName,
    status: r.status,
    confidence: Math.max(0, Math.min(1, r.confidence)),
    explanation: r.explanation,
    recommendation: r.recommendation,
    sources: r.sources || [],
  }));
}
