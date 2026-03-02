export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { SearchPageClient } from "./search-client";
import { GuidedSearch } from "@/components/guided-search";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    districts?: string;
    types?: string;
    minRent?: string;
    maxRent?: string;
    minArea?: string;
    maxArea?: string;
    fengShuiRated?: string;
    minFengShui?: string;
    sort?: string;
    page?: string;
    mode?: string;
    shortlist?: string;
    nearMtr?: string;
  }>;
}

function parseMtrMinutes(mtrProximity: string | null): number | null {
  if (!mtrProximity) return null;
  const match = mtrProximity.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : null;
}

function computeSuitabilityScore(
  property: { monthlyRent: number | null; saleableArea: number | null; grossArea: number | null; district: string; mtrProximity: string | null },
  filters: { maxRent?: number; minArea?: number; maxArea?: number; districts?: string[]; nearMtrMaxMinutes?: number }
): number {
  let score = 50;
  const area = property.saleableArea ?? property.grossArea;

  if (filters.maxRent && property.monthlyRent) {
    const rentRatio = property.monthlyRent / filters.maxRent;
    if (rentRatio <= 0.8) score += 15;
    else if (rentRatio <= 1) score += 5;
    else score -= 20;
  }
  if (filters.minArea && area && area >= filters.minArea) score += 10;
  if (filters.districts?.length && filters.districts.some((d) => property.district.toLowerCase().includes(d.toLowerCase()))) score += 15;
  if (filters.nearMtrMaxMinutes) {
    const mins = parseMtrMinutes(property.mtrProximity);
    if (mins != null && mins <= filters.nearMtrMaxMinutes) score += 15;
    else if (property.mtrProximity) score += 5;
  }
  return Math.max(0, Math.min(100, score));
}

async function searchProperties(params: Awaited<SearchPageProps["searchParams"]>) {
  const where: Prisma.PropertyWhereInput = { status: "active" };

  if (params.districts) {
    const districts = params.districts.split(",").filter(Boolean);
    if (districts.length === 1) {
      where.district = { contains: districts[0], mode: "insensitive" };
    } else {
      where.OR = districts.map((d) => ({
        district: { contains: d, mode: "insensitive" as const },
      }));
    }
  }

  if (params.types) {
    where.propertyType = { in: params.types.split(",").filter(Boolean) };
  }

  if (params.minRent || params.maxRent) {
    where.monthlyRent = {};
    if (params.minRent) where.monthlyRent.gte = Number(params.minRent);
    if (params.maxRent) where.monthlyRent.lte = Number(params.maxRent);
  }

  if (params.minArea || params.maxArea) {
    const areaFilter: Prisma.FloatNullableFilter = {};
    if (params.minArea) areaFilter.gte = Number(params.minArea);
    if (params.maxArea) areaFilter.lte = Number(params.maxArea);

    where.AND = [
      ...(where.AND ? (where.AND as Prisma.PropertyWhereInput[]) : []),
      {
        OR: [
          { saleableArea: areaFilter },
          { grossArea: areaFilter },
        ],
      },
    ];
  }

  if (params.fengShuiRated === "1" || params.minFengShui) {
    const fengShuiFilter: Prisma.IntNullableFilter = {};
    if (params.fengShuiRated === "1") fengShuiFilter.not = null;
    if (params.minFengShui) fengShuiFilter.gte = Number(params.minFengShui);
    where.fengShuiScore = fengShuiFilter;
  }

  if (params.q) {
    const words = params.q.split(/\s+/).filter((w) => w.length >= 2);
    const searchFields = ["title", "description", "district", "address", "buildingName"] as const;

    if (words.length > 1) {
      const wordConditions: Prisma.PropertyWhereInput[] = words.map((word) => ({
        OR: searchFields.map((field) => ({
          [field]: { contains: word, mode: "insensitive" as const },
        })),
      }));
      where.AND = [
        ...(where.AND ? (where.AND as Prisma.PropertyWhereInput[]) : []),
        { OR: wordConditions },
      ];
    } else {
      where.AND = [
        ...(where.AND ? (where.AND as Prisma.PropertyWhereInput[]) : []),
        {
          OR: searchFields.map((field) => ({
            [field]: { contains: params.q!, mode: "insensitive" as const },
          })),
        },
      ];
    }
  }

  let orderBy: Prisma.PropertyOrderByWithRelationInput = { updatedAt: "desc" };
  switch (params.sort) {
    case "price_asc":
      orderBy = { monthlyRent: "asc" };
      break;
    case "price_desc":
      orderBy = { monthlyRent: "desc" };
      break;
    case "area_asc":
      orderBy = { saleableArea: "asc" };
      break;
    case "area_desc":
      orderBy = { saleableArea: "desc" };
      break;
    case "recent":
      orderBy = { createdAt: "desc" };
      break;
    case "score":
      orderBy = { engagementScore: "desc" };
      break;
  }

  const page = Math.max(1, Number(params.page) || 1);
  const isShortlist = params.shortlist === "1";
  const limit = isShortlist ? 50 : 24;

  try {
    const [rawProperties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: isShortlist ? 0 : (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { sourceListings: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    // Filter by nearMtr in code (mtrProximity is a string like "5 min walk")
    let properties = rawProperties;
    if (params.nearMtr) {
      const maxMins = Number(params.nearMtr);
      if (!isNaN(maxMins)) {
        properties = rawProperties.filter((p) => {
          const mins = parseMtrMinutes(p.mtrProximity);
          return mins != null && mins <= maxMins;
        });
      }
    }

    // Suitability scoring for shortlist
    const filters = {
      maxRent: params.maxRent ? Number(params.maxRent) : undefined,
      minArea: params.minArea ? Number(params.minArea) : undefined,
      maxArea: params.maxArea ? Number(params.maxArea) : undefined,
      districts: params.districts?.split(",").filter(Boolean),
      nearMtrMaxMinutes: params.nearMtr ? Number(params.nearMtr) : undefined,
    };

    let mapped = properties.map((p) => ({
      id: p.id,
      title: p.title,
      district: p.district,
      address: p.address,
      propertyType: p.propertyType,
      monthlyRent: p.monthlyRent,
      saleableArea: p.saleableArea,
      grossArea: p.grossArea,
      price: p.price,
      images: p.images,
      verificationScore: p.verificationScore,
      engagementScore: p.engagementScore,
      floor: p.floor,
      aiScore: p.aiScore,
      buildingGrade: p.buildingGrade,
      sourceCount: p._count.sourceListings,
      mtrProximity: p.mtrProximity,
      suitabilityScore: 0 as number,
    }));

    if (isShortlist) {
      mapped = mapped
        .map((p) => ({
          ...p,
          suitabilityScore: computeSuitabilityScore(
            { ...p, mtrProximity: p.mtrProximity },
            filters
          ),
        }))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
        .slice(0, 12);
    }

    return {
      properties: mapped.map(({ mtrProximity, suitabilityScore, ...rest }) => ({
        ...rest,
        ...(isShortlist && suitabilityScore != null && { suitabilityScore }),
      })),
      total: isShortlist ? mapped.length : total,
      page: isShortlist ? 1 : page,
      limit: isShortlist ? 12 : limit,
      totalPages: isShortlist ? 1 : Math.ceil(total / 24),
      isShortlist,
    };
  } catch {
    return { properties: [], total: 0, page: 1, limit: 24, totalPages: 1, isShortlist: false };
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  if (params.mode === "guided") {
    const initialImageFilters =
      params.districts || params.types || params.minRent || params.maxRent || params.minArea || params.maxArea
        ? {
            districts: params.districts?.split(",").filter(Boolean),
            propertyTypes: params.types?.split(",").filter(Boolean),
            minRent: params.minRent ? Number(params.minRent) : undefined,
            maxRent: params.maxRent ? Number(params.maxRent) : undefined,
            minArea: params.minArea ? Number(params.minArea) : undefined,
            maxArea: params.maxArea ? Number(params.maxArea) : undefined,
          }
        : undefined;

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        }
      >
        <GuidedSearch
          initialQuery={params.q}
          initialImageFilters={initialImageFilters}
        />
      </Suspense>
    );
  }

  const hasAnyFilter = !!(
    params.districts || params.types || params.minRent || params.maxRent ||
    params.minArea || params.maxArea || params.q || params.fengShuiRated || params.minFengShui
  );

  const { properties, total, page, limit, totalPages, isShortlist } = await searchProperties(params);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      }
    >
      <SearchPageClient
        properties={properties}
        total={total}
        page={page}
        totalPages={totalPages}
        params={params}
        hasAnyFilter={hasAnyFilter}
        isShortlist={isShortlist}
      />
    </Suspense>
  );
}
