import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runRiskAssessment } from "@/lib/ai/risk-engine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { propertyId, sectorType } = await req.json();

    if (!propertyId || !sectorType) {
      return NextResponse.json(
        { error: "propertyId and sectorType are required" },
        { status: 400 }
      );
    }

    const useBedrock =
      (process.env.BEDROCK_RISK_ASSESSMENT_ENABLED === "true" ||
        process.env.BEDROCK_RISK_ASSESSMENT_ENABLED === "1") &&
      process.env.AWS_REGION;
    const hasMinimax = Boolean(process.env.MINIMAX_API_KEY);
    if (!useBedrock && !hasMinimax) {
      return NextResponse.json(
        { error: "AI not configured (set MINIMAX_API_KEY or enable Bedrock with AWS_REGION)" },
        { status: 503 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { evidencePack: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const existingChecks = await prisma.riskCheck.findMany({
      where: { propertyId, sectorType },
    });

    if (existingChecks.length > 0) {
      return NextResponse.json({ checks: existingChecks });
    }

    const results = await runRiskAssessment(sectorType, {
      title: property.title,
      description: property.description,
      district: property.district,
      propertyType: property.propertyType,
      floor: property.floor,
      features: property.features as Record<string, unknown> | null,
      evidencePack: property.evidencePack
        ? {
            ubwStatus: property.evidencePack.ubwStatus,
            ubwDetail: property.evidencePack.ubwDetail,
            buildingRecordStatus: property.evidencePack.buildingRecordStatus,
          }
        : null,
    });

    const savedChecks = await Promise.all(
      results.map((r) =>
        prisma.riskCheck.upsert({
          where: {
            propertyId_sectorType_checkName: {
              propertyId,
              sectorType,
              checkName: r.checkName,
            },
          },
          update: {
            status: r.status,
            confidence: r.confidence,
            explanation: r.explanation,
            recommendation: r.recommendation,
            sources: r.sources,
          },
          create: {
            propertyId,
            sectorType,
            checkName: r.checkName,
            status: r.status,
            confidence: r.confidence,
            explanation: r.explanation,
            recommendation: r.recommendation,
            sources: r.sources,
          },
        })
      )
    );

    return NextResponse.json({ checks: savedChecks });
  } catch (error) {
    console.error("Risk check error:", error);
    return NextResponse.json(
      { error: "Failed to run risk assessment" },
      { status: 500 }
    );
  }
}
