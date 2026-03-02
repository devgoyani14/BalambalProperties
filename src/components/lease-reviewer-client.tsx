"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertOctagon,
  Upload,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LeaseReviewResult, LeaseReviewIssue } from "@/lib/ai/lease-reviewer";
import type { ComplianceAgentResult } from "@/types";
import { DEMO_LEASE } from "@/lib/demo-lease";

const severityConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  critical: {
    label: "Critical",
    icon: <AlertOctagon className="h-4 w-4" />,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  high: {
    label: "High",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  medium: {
    label: "Medium",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-amber-600",
    bg: "bg-amber-50/70 border-amber-200",
  },
  low: {
    label: "Low",
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
};

const riskLevelConfig: Record<
  string,
  { label: string; color: string; bg: string; variant: "destructive" | "warning" | "success" | "secondary" }
> = {
  critical: { label: "Critical Risk", color: "text-red-700", bg: "bg-red-50", variant: "destructive" },
  high: { label: "High Risk", color: "text-red-600", bg: "bg-red-50", variant: "destructive" },
  medium: { label: "Medium Risk", color: "text-amber-700", bg: "bg-amber-50", variant: "warning" },
  low: { label: "Low Risk", color: "text-emerald-700", bg: "bg-emerald-50", variant: "success" },
};

const complianceStatusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  compliant: { label: "Compliant", color: "text-emerald-700", bg: "bg-emerald-50" },
  at_risk: { label: "At risk", color: "text-amber-700", bg: "bg-amber-50" },
  non_compliant: { label: "Non-compliant", color: "text-red-700", bg: "bg-red-50" },
  unknown: { label: "Unknown", color: "text-gray-600", bg: "bg-gray-50" },
};

function ComplianceCard({ compliance }: { compliance: ComplianceAgentResult }) {
  const config = complianceStatusConfig[compliance.status] ?? complianceStatusConfig.unknown;
  return (
    <Card className="border-l-4 border-l-indigo-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-indigo-600" />
          Regulatory compliance (HK)
        </CardTitle>
        <p className="text-sm text-muted-foreground">{compliance.summary}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
          <span className="text-xs text-gray-500">
            Confidence: {Math.round(compliance.confidence * 100)}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {compliance.regulatoryFlags.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Flags
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {compliance.regulatoryFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
        {compliance.recommendations.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Recommendations
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {compliance.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
        {compliance.references.length > 0 && (
          <p className="text-xs text-gray-500">
            References: {compliance.references.join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function IssueItem({ issue }: { issue: LeaseReviewIssue }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[issue.severity] ?? severityConfig.medium;

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-3">
          <span className={config.color}>{config.icon}</span>
          <div>
            <p className="font-medium text-gray-900">{issue.title}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{issue.description}</p>
          </div>
        </div>
        <Badge variant="outline" className={`flex-shrink-0 ${config.color}`}>
          {config.label}
        </Badge>
        {expanded ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-200/60 pt-4">
          {issue.clause && (
            <div className="rounded bg-white/80 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Relevant clause
              </p>
              <p className="mt-1 italic text-gray-700">&ldquo;{issue.clause}&rdquo;</p>
            </div>
          )}
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-gray-800">
              <span className="text-gray-500">Recommendation: </span>
              {issue.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText.trim();
}

export function LeaseReviewerClient() {
  const [leaseText, setLeaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [result, setResult] = useState<LeaseReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLoadDemo() {
    setLeaseText(DEMO_LEASE);
    setResult(null);
    setError(null);
  }

  async function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    setPdfExtracting(true);
    setError(null);
    try {
      const text = await extractTextFromPdf(file);
      setLeaseText(text || "Could not extract text from this PDF. It may be scanned/image-based.");
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text from PDF");
    } finally {
      setPdfExtracting(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/lease-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to review lease");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="lease-text"
              className="flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <FileText className="h-4 w-4" />
              Paste or upload your lease
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || pdfExtracting}
              >
                {pdfExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {pdfExtracting ? "Extracting…" : "Upload PDF"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadDemo}
                disabled={loading}
              >
                <Sparkles className="h-4 w-4" />
                Load demo
              </Button>
            </div>
          </div>
          <textarea
            id="lease-text"
            value={leaseText}
            onChange={(e) => setLeaseText(e.target.value)}
            placeholder="Paste your lease text here, or upload a PDF above. You can also load our shady demo lease to try the reviewer."
            className="min-h-[240px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
            disabled={loading}
          />
        </div>

        <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing lease…
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Review lease
            </>
          )}
        </Button>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Review summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{result.summary}</p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative h-14 w-14">
                    <svg width={56} height={56} className="-rotate-90">
                      <circle
                        cx={28}
                        cy={28}
                        r={24}
                        fill="none"
                        strokeWidth={6}
                        className="stroke-gray-200"
                      />
                      <circle
                        cx={28}
                        cy={28}
                        r={24}
                        fill="none"
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 24}
                        strokeDashoffset={
                          2 * Math.PI * 24 * (1 - result.overallScore / 100)
                        }
                        className={
                          result.riskLevel === "low"
                            ? "stroke-emerald-500"
                            : result.riskLevel === "medium"
                              ? "stroke-amber-500"
                              : "stroke-red-500"
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{result.overallScore}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
                <Badge variant={riskLevelConfig[result.riskLevel]?.variant ?? "secondary"}>
                  {riskLevelConfig[result.riskLevel]?.label ?? result.riskLevel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Red flags */}
          {result.redFlags.length > 0 && (
            <Card className="border-l-4 border-l-red-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-700">
                  <AlertOctagon className="h-5 w-5" />
                  Red flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Regulatory compliance (AWS Bedrock compliance agent) */}
          {result.compliance && (
            <ComplianceCard compliance={result.compliance} />
          )}

          {/* Issues */}
          {result.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Issues found ({result.issues.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click each item to expand and see recommendations
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.issues.map((issue, i) => (
                  <IssueItem key={i} issue={issue} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            AI-generated review for guidance only. Always have a qualified solicitor review your
            lease before signing.
          </div>
        </div>
      )}
    </div>
  );
}
