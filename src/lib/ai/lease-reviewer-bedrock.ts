import { bedrockConverse } from "./bedrock-client";
import type { LeaseReviewResult, LeaseReviewIssue } from "./lease-reviewer";

const LEGAL_AGENT_SYSTEM = `You are an expert Hong Kong commercial lease reviewer (legal agent). Your job is to identify shady, unfair, or problematic clauses in commercial lease agreements.

Focus on:
- Unfair or one-sided terms favoring the landlord
- Hidden fees, ambiguous charges, or unclear cost allocations
- Excessive penalty clauses (e.g. disproportionate liquidated damages)
- Unclear repair/maintenance responsibilities
- Ambiguous security deposit or advance rent terms
- Overly restrictive subletting or assignment clauses
- Unfair termination or break clause terms
- Missing landlord obligations (quiet enjoyment, maintenance, etc.)
- Rent escalation clauses that may be excessive or unclear
- Service charge or management fee ambiguities
- Liability clauses that unfairly limit landlord responsibility
- Clauses that may conflict with Hong Kong law or tenant protections

For each issue found:
- category: e.g. "rent_escalation", "penalty_clause", "hidden_fees", "maintenance", "termination", "deposit", "subletting", "liability", "ambiguity"
- severity: "critical" (deal-breaker), "high" (negotiate strongly), "medium" (review carefully), "low" (minor concern)
- title: short descriptive title
- description: clear explanation of the problem
- clause: relevant excerpt from the lease if identifiable
- recommendation: specific action for the tenant

Respond ONLY with a valid JSON object. No markdown, no explanation, no code fence, just raw JSON.`;

function buildUserPrompt(leaseText: string): string {
  return `Review this commercial lease text for shady, unfair, or problematic clauses. Return JSON in this exact format:

{
  "summary": "2-4 sentence overall summary of findings",
  "overallScore": 0-100 (100 = clean, 0 = very risky),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "issues": [
    {
      "category": "string",
      "severity": "critical" | "high" | "medium" | "low",
      "title": "string",
      "description": "string",
      "clause": "optional excerpt",
      "recommendation": "string"
    }
  ],
  "redFlags": ["list of critical one-line warnings"]
}

Lease text:
---
${leaseText.slice(0, 12000)}
---`;
}

function parseLegalAgentResponse(content: string): LeaseReviewResult {
  const cleaned = content
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  const issues: LeaseReviewIssue[] = (parsed.issues || []).map((i: LeaseReviewIssue) => ({
    category: i.category || "other",
    severity: ["critical", "high", "medium", "low"].includes(i.severity)
      ? i.severity
      : "medium",
    title: i.title || "Unspecified issue",
    description: i.description || "",
    clause: i.clause,
    recommendation: i.recommendation || "Consult a solicitor.",
  }));

  const overallScore = Math.max(0, Math.min(100, Number(parsed.overallScore) ?? 50));
  const riskLevel = ["low", "medium", "high", "critical"].includes(parsed.riskLevel)
    ? parsed.riskLevel
    : overallScore >= 80
      ? "low"
      : overallScore >= 60
        ? "medium"
        : overallScore >= 40
          ? "high"
          : "critical";

  return {
    summary: parsed.summary || "Review completed. See issues below.",
    overallScore,
    riskLevel,
    issues,
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
  };
}

/**
 * Run the Bedrock-powered legal agent for lease review.
 * Same contract as reviewLease() for drop-in use.
 */
export async function reviewLeaseWithBedrock(leaseText: string): Promise<LeaseReviewResult> {
  const trimmed = leaseText.trim();
  if (!trimmed) {
    return {
      summary:
        "No lease text provided. Paste or upload your lease document to get an AI review.",
      overallScore: 0,
      riskLevel: "critical",
      issues: [],
      redFlags: ["No content to review"],
    };
  }

  const raw = await bedrockConverse(LEGAL_AGENT_SYSTEM, buildUserPrompt(trimmed), {
    maxTokens: 3000,
    temperature: 0.2,
  });
  return parseLegalAgentResponse(raw);
}
