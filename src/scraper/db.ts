import { type Prisma, PrismaClient } from "@prisma/client";
import { createLogger } from "./logger";
import type { NormalizedProperty } from "./normalizer";

function toJsonValue(obj: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (!obj) return undefined;
  return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
}

const log = createLogger("db");

const prisma = new PrismaClient();

export interface UpsertResult {
  created: number;
  updated: number;
  errors: number;
  total: number;
}

async function upsertOne(prop: NormalizedProperty): Promise<"created" | "updated" | "error"> {
  try {
    const existing = await prisma.property.findUnique({
      where: { canonicalId: prop.canonicalId },
      select: { id: true, title: true, images: true, sourceListings: { select: { source: true } } },
    });

    if (existing) {
      await prisma.property.update({
        where: { canonicalId: prop.canonicalId },
        data: {
          title: prop.title || existing.title,
          titleZh: prop.titleZh || undefined,
          description: prop.description || undefined,
          descriptionZh: prop.descriptionZh || undefined,
          district: prop.district || undefined,
          address: prop.address || undefined,
          propertyType: prop.propertyType || undefined,
          saleableArea: prop.saleableArea ?? undefined,
          grossArea: prop.grossArea ?? undefined,
          monthlyRent: prop.monthlyRent ?? undefined,
          psfRent: prop.psfRent ?? undefined,
          managementFee: prop.managementFee ?? undefined,
          price: prop.price ?? undefined,
          floor: prop.floor || undefined,
          images: prop.images.length > 0 ? prop.images : existing.images,
          floorPlanUrl: prop.floorPlanUrl || undefined,
          latitude: prop.latitude ?? undefined,
          longitude: prop.longitude ?? undefined,
          features: toJsonValue(prop.features),
          buildingName: prop.buildingName || undefined,
          mtrProximity: prop.mtrProximity || undefined,
          mtrStation: prop.mtrStation || undefined,
          hasExhaust: prop.hasExhaust || undefined,
          loadingAccess: prop.loadingAccess || undefined,
          agentName: prop.agentName || undefined,
          agentPhone: prop.agentContact || undefined,
          agentCompany: prop.agentCompany || undefined,
          status: "active",
        },
      });

      const sourceExists = existing.sourceListings.some((sl) => sl.source === prop.source);
      if (!sourceExists) {
        await prisma.sourceListing.create({
          data: {
            propertyId: existing.id,
            source: prop.source,
            sourceUrl: prop.sourceUrl,
            rawData: toJsonValue(prop.rawData) ?? {},
            agentName: prop.agentName,
            agentContact: prop.agentContact,
            scrapedAt: new Date(),
          },
        });
      }
      return "updated";
    } else {
      const property = await prisma.property.create({
        data: {
          canonicalId: prop.canonicalId,
          title: prop.title,
          titleZh: prop.titleZh,
          description: prop.description,
          descriptionZh: prop.descriptionZh,
          district: prop.district,
          address: prop.address,
          propertyType: prop.propertyType,
          saleableArea: prop.saleableArea,
          grossArea: prop.grossArea,
          monthlyRent: prop.monthlyRent,
          psfRent: prop.psfRent,
          managementFee: prop.managementFee,
          price: prop.price,
          floor: prop.floor,
          images: prop.images,
          floorPlanUrl: prop.floorPlanUrl,
          latitude: prop.latitude,
          longitude: prop.longitude,
          features: toJsonValue(prop.features),
          buildingName: prop.buildingName,
          mtrProximity: prop.mtrProximity,
          mtrStation: prop.mtrStation,
          hasExhaust: prop.hasExhaust || false,
          loadingAccess: prop.loadingAccess || false,
          agentName: prop.agentName,
          agentPhone: prop.agentContact,
          agentCompany: prop.agentCompany,
          verificationScore: 0,
          status: "active",
        },
      });

      await prisma.sourceListing.create({
        data: {
          propertyId: property.id,
          source: prop.source,
          sourceUrl: prop.sourceUrl,
          rawData: toJsonValue(prop.rawData) ?? {},
          agentName: prop.agentName,
          agentContact: prop.agentContact,
          scrapedAt: new Date(),
        },
      });
      return "created";
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Failed to upsert ${prop.canonicalId}: ${msg}`);
    return "error";
  }
}

const BATCH_CONCURRENCY = 25;

export async function upsertProperties(properties: NormalizedProperty[]): Promise<UpsertResult> {
  const result: UpsertResult = { created: 0, updated: 0, errors: 0, total: properties.length };

  log.info(`Upserting ${properties.length} properties (concurrency: ${BATCH_CONCURRENCY})...`);

  for (let i = 0; i < properties.length; i += BATCH_CONCURRENCY) {
    const batch = properties.slice(i, i + BATCH_CONCURRENCY);
    const outcomes = await Promise.all(batch.map(upsertOne));

    for (const outcome of outcomes) {
      if (outcome === "created") result.created++;
      else if (outcome === "updated") result.updated++;
      else result.errors++;
    }

    const done = Math.min(i + BATCH_CONCURRENCY, properties.length);
    if (done % 100 === 0 || done === properties.length) {
      log.info(`  Progress: ${done}/${properties.length} (${result.created} new, ${result.updated} updated, ${result.errors} errors)`);
    }
  }

  log.info(`Upsert complete: ${result.created} created, ${result.updated} updated, ${result.errors} errors`);
  return result;
}

export async function markStaleListings(maxAgeDays: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  const result = await prisma.property.updateMany({
    where: {
      status: "active",
      updatedAt: { lt: cutoff },
    },
    data: { status: "stale" },
  });

  if (result.count > 0) {
    log.info(`Marked ${result.count} properties as stale (not updated in ${maxAgeDays} days)`);
  }

  return result.count;
}

export async function getScraperStats(): Promise<{
  totalProperties: number;
  activeProperties: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  byDistrict: Record<string, number>;
}> {
  const [total, active, sourceListings, properties] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: "active" } }),
    prisma.sourceListing.groupBy({ by: ["source"], _count: true }),
    prisma.property.groupBy({ by: ["propertyType"], _count: true }),
  ]);

  const districtGroups = await prisma.property.groupBy({ by: ["district"], _count: true });

  return {
    totalProperties: total,
    activeProperties: active,
    bySource: Object.fromEntries(sourceListings.map((s) => [s.source, s._count])),
    byType: Object.fromEntries(properties.map((p) => [p.propertyType, p._count])),
    byDistrict: Object.fromEntries(districtGroups.map((d) => [d.district, d._count])),
  };
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
