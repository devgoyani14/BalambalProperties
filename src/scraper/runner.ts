import { SCRAPER_CONFIG, DEFAULT_SCRAPE_OPTIONS, FULL_SCAN_OPTIONS } from "./config";
import { upsertProperties, markStaleListings, getScraperStats, disconnect } from "./db";
import { createLogger } from "./logger";
import { normalizeListing, deduplicateListings } from "./normalizer";
import { CentalineScraper } from "./sources/centaline";
import { GoHomeScraper } from "./sources/gohome";
import { MidlandIciScraper } from "./sources/midland-ici";
import { SpaciousScraper } from "./sources/spacious";
import { TwentyEightHseScraper } from "./sources/twenty-eight-hse";
import type { RawListing, ScraperResult, ScraperStats, ScrapeOptions } from "./types";

const log = createLogger("runner");

function createScrapers() {
  const scrapers = [];
  const sources = SCRAPER_CONFIG.sources;

  if (sources.twentyEightHse.enabled) scrapers.push(new TwentyEightHseScraper());
  if (sources.centaline.enabled) scrapers.push(new CentalineScraper());
  if (sources.spacious.enabled) scrapers.push(new SpaciousScraper());
  if (sources.midlandIci.enabled) scrapers.push(new MidlandIciScraper());
  scrapers.push(new GoHomeScraper());

  return scrapers;
}

export async function runScraper(fullScan = false): Promise<ScraperStats> {
  const startTime = Date.now();
  const options: ScrapeOptions = fullScan ? FULL_SCAN_OPTIONS : DEFAULT_SCRAPE_OPTIONS;

  log.info(`Starting ${fullScan ? "FULL" : "incremental"} scrape...`);
  log.info(`Options: maxPages=${options.maxPagesPerCategory}, delay=${options.delayBetweenRequests}ms`);

  const scrapers = createScrapers();
  const sourceStats: Record<string, { listings: number; errors: number }> = {};
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let totalListings = 0;

  for (const scraper of scrapers) {
    log.info(`\n${"=".repeat(60)}`);
    log.info(`Running: ${scraper.sourceName}`);
    log.info(`${"=".repeat(60)}`);

    try {
      const result = await scraper.run(options);
      sourceStats[result.source] = {
        listings: result.listings.length,
        errors: result.errors.length,
      };
      totalListings += result.listings.length;
      totalErrors += result.errors.length;

      if (result.listings.length > 0) {
        log.info(`\nWriting ${result.source} data to database...`);
        const deduped = deduplicateListings(result.listings);
        log.info(`${result.source}: ${result.listings.length} raw → ${deduped.length} after dedup`);
        const normalized = deduped.map(normalizeListing);
        const upsertResult = await upsertProperties(normalized);
        totalCreated += upsertResult.created;
        totalUpdated += upsertResult.updated;
        totalErrors += upsertResult.errors;
        log.info(`${result.source}: ${upsertResult.created} created, ${upsertResult.updated} updated, ${upsertResult.errors} errors → saved to DB ✓`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`Scraper ${scraper.sourceName} crashed: ${msg}`);
      sourceStats[scraper.sourceName] = { listings: 0, errors: 1 };
      totalErrors++;
    }
  }

  const staleCount = await markStaleListings(30);
  const duration = Date.now() - startTime;

  const stats: ScraperStats = {
    totalListings,
    newListings: totalCreated,
    updatedListings: totalUpdated,
    errors: totalErrors,
    duration,
    sources: sourceStats,
  };

  log.info(`\n${"=".repeat(60)}`);
  log.info("SCRAPE COMPLETE");
  log.info(`${"=".repeat(60)}`);
  log.info(`Duration: ${(duration / 1000).toFixed(1)}s`);
  log.info(`New: ${stats.newListings} | Updated: ${stats.updatedListings} | Errors: ${stats.errors}`);
  if (staleCount > 0) log.info(`Stale: ${staleCount} properties marked stale`);

  for (const [source, data] of Object.entries(sourceStats)) {
    log.info(`  ${source}: ${data.listings} listings, ${data.errors} errors`);
  }

  try {
    const dbStats = await getScraperStats();
    log.info(`\nDatabase totals:`);
    log.info(`  Total: ${dbStats.totalProperties} | Active: ${dbStats.activeProperties}`);
    log.info(`  By source:`, dbStats.bySource);
    log.info(`  By type:`, dbStats.byType);
  } catch {
    // stats query failed, not critical
  }

  return stats;
}

export async function shutdown(): Promise<void> {
  await disconnect();
}
