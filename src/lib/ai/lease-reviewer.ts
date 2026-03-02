import OpenAI from "openai";
import { isBedrockConfigured } from "./bedrock-client";
import { reviewLeaseWithBedrock } from "./lease-reviewer-bedrock";
import { runComplianceAssessment } from "./compliance-agent-bedrock";
import type { ComplianceAgentResult } from "@/types";

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

export interface LeaseReviewIssue {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  clause?: string;
  recommendation: string;
}

export interface LeaseReviewResult {
  summary: string;
  overallScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  issues: LeaseReviewIssue[];
  redFlags: string[];
  /** Present when AWS Bedrock legal + compliance agents are used. */
  compliance?: ComplianceAgentResult;
}

const SYSTEM_PROMPT = `You are an expert Hong Kong commercial lease reviewer. Your job is to identify shady, unfair, or problematic clauses in commercial lease agreements.

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

Return a valid JSON object. Be thorough but concise. If the lease text is too short or unclear, note that in the summary.`;

/** Use AWS Bedrock legal + compliance agents when enabled and configured. */
function useBedrockLeaseReview(): boolean {
  const enabled = process.env.BEDROCK_LEASE_REVIEW_ENABLED === "true" || process.env.BEDROCK_LEASE_REVIEW_ENABLED === "1";
  return enabled && isBedrockConfigured();
}

export async function reviewLease(leaseText: string): Promise<LeaseReviewResult> {
  const trimmed = leaseText.trim();
  if (!trimmed) {
    return {
      summary: "No lease text provided. Paste or upload your lease document to get an AI review.",
      overallScore: 0,
      riskLevel: "critical",
      issues: [],
      redFlags: ["No content to review"],
    };
  }

  if (useBedrockLeaseReview()) {
    try {
      const [legalResult, complianceResult] = await Promise.all([
        reviewLeaseWithBedrock(trimmed),
        runComplianceAssessment(trimmed),
      ]);
      return {
        ...legalResult,
        compliance: complianceResult,
      };
    } catch (error) {
      console.error("Bedrock lease review error:", error);
      return {
        summary:
          "AWS Bedrock review failed. Falling back is not configured. Please try again or use a solicitor.",
        overallScore: 0,
        riskLevel: "critical",
        issues: [],
        redFlags: ["Bedrock review failed. Please try again or seek professional advice."],
      };
    }
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "system",
          content:
            SYSTEM_PROMPT +
            "\n\nIMPORTANT: Respond ONLY with a valid JSON object. No markdown, no explanation, just raw JSON.",
        },
        {
          role: "user",
          content: `Review this commercial lease text for shady, unfair, or problematic clauses. Return JSON in this exact format:

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
${trimmed.slice(0, 12000)}
---`,
        },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    let content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    content = content
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(content);

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
  } catch (error) {
    console.error("Lease review error:", error);
    return {
      summary:
        "Unable to complete the lease review. The AI service may be unavailable. Please try again or consult a qualified solicitor.",
      overallScore: 0,
      riskLevel: "critical",
      issues: [],
      redFlags: ["Review failed. Please try again or seek professional advice."],
    };
  }
}
