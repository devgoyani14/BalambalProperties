import { NextRequest, NextResponse } from "next/server";
import { reviewLease } from "@/lib/ai/lease-reviewer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leaseText = typeof body.leaseText === "string" ? body.leaseText : "";

    if (!leaseText.trim()) {
      return NextResponse.json(
        { error: "leaseText is required and must be non-empty" },
        { status: 400 }
      );
    }

    const useBedrock =
      (process.env.BEDROCK_LEASE_REVIEW_ENABLED === "true" ||
        process.env.BEDROCK_LEASE_REVIEW_ENABLED === "1") &&
      process.env.AWS_REGION;
    const hasMinimax = Boolean(process.env.MINIMAX_API_KEY);
    if (!useBedrock && !hasMinimax) {
      return NextResponse.json(
        { error: "AI service not configured (set MINIMAX_API_KEY or enable Bedrock with AWS_REGION)" },
        { status: 503 }
      );
    }

    const result = await reviewLease(leaseText);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Lease review API error:", error);
    return NextResponse.json(
      { error: "Failed to review lease" },
      { status: 500 }
    );
  }
}
