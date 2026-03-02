import { bedrockConverse } from "./bedrock-client";
import type { ComplianceAgentResult } from "@/types";

export type { ComplianceAgentResult };

const COMPLIANCE_AGENT_SYSTEM = `You are a Hong Kong commercial property and lease compliance expert. Assess whether a lease and its described use align with Hong Kong regulations and common compliance requirements.

Consider:
- Land Registry and deed/registration requirements
- Landlord and Tenant (Consolidation) Ordinance considerations
- Buildings Ordinance and BRAVO (unauthorized building works)
- Fire safety (FSD) and licensing implications for the stated use
- FEHD licensing for F&B, retail, or relevant sectors
- Planning conditions and land use restrictions
- Stamp duty and lease registration
- UBW (unauthorized building works) disclosure and impact
- Standard tenancy and security of tenure norms in HK

Respond ONLY with a valid JSON object. No markdown, no explanation, no code fence, just raw JSON.`;

function buildComplianceUserPrompt(leaseText: string): string {
  return `Assess this commercial lease for Hong Kong regulatory and compliance credibility. Return JSON in this exact format:

{
  "summary": "2-4 sentence overall compliance assessment",
  "status": "compliant" | "at_risk" | "non_compliant" | "unknown",
  "confidence": 0-1,
  "regulatoryFlags": ["list of specific compliance concerns or red flags"],
  "recommendations": ["prioritized actions for the tenant"],
  "references": ["relevant HK government or legal references if applicable"]
}

Lease text (excerpt):
---
${leaseText.slice(0, 8000)}
---`;
}

function parseComplianceResponse(content: string): ComplianceAgentResult {
  const cleaned = content
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  const status = ["compliant", "at_risk", "non_compliant", "unknown"].includes(parsed.status)
    ? parsed.status
    : "unknown";
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) ?? 0.5));

  return {
    summary: parsed.summary || "Compliance assessment completed.",
    status,
    confidence,
    regulatoryFlags: Array.isArray(parsed.regulatoryFlags) ? parsed.regulatoryFlags : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    references: Array.isArray(parsed.references) ? parsed.references : [],
  };
}

/**
 * Run the Bedrock-powered compliance agent on lease text.
 * Use alongside the legal agent for a fuller "credibility" evaluation.
 */
export async function runComplianceAssessment(leaseText: string): Promise<ComplianceAgentResult> {
  const trimmed = leaseText.trim();
  if (!trimmed) {
    return {
      summary: "No lease text provided for compliance assessment.",
      status: "unknown",
      confidence: 0,
      regulatoryFlags: [],
      recommendations: ["Provide lease text for compliance review."],
      references: [],
    };
  }

  try {
    const raw = await bedrockConverse(COMPLIANCE_AGENT_SYSTEM, buildComplianceUserPrompt(trimmed), {
      maxTokens: 2000,
      temperature: 0.2,
    });
    return parseComplianceResponse(raw);
  } catch (error) {
    console.error("Compliance agent error:", error);
    return {
      summary: "Compliance assessment could not be completed. Please try again or seek professional advice.",
      status: "unknown",
      confidence: 0,
      regulatoryFlags: [],
      recommendations: ["Retry the assessment or consult a qualified professional."],
      references: [],
    };
  }
}
