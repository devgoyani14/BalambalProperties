import type { ScrapeOptions } from "./types";

export const SCRAPER_CONFIG = {
  sources: {
    twentyEightHse: {
      name: "28hse",
      baseUrl: "https://www.28hse.com",
      enabled: true,
      rentCategories: [
        { type: "office", path: "/en/rent/office" },
        { type: "shop", path: "/en/rent/shop" },
      ],
      saleCategories: [
        { type: "office", path: "/en/buy/office" },
        { type: "shop", path: "/en/buy/shop" },
      ],
      regions: [
        { id: "a1", name: "Hong Kong Island" },
        { id: "a2", name: "Kowloon" },
        { id: "a3", name: "New Territories" },
      ],
    },
    centaline: {
      name: "centaline",
      baseUrl: "https://oir.centanet.com",
      enabled: true,
      categories: [
        { type: "office", path: "/en/all/office/" },
        { type: "retail", path: "/en/all/retail/" },
        { type: "industrial", path: "/en/all/industrial/" },
      ],
    },
    spacious: {
      name: "spacious",
      baseUrl: "https://www.spacious.hk",
      enabled: true,
      listingPaths: [
        { type: "commercial", path: "/en/commercial/c/hong-kong/for-rent" },
        { type: "office", path: "/en/commercial/c/hong-kong/n/all/for-rent" },
      ],
    },
    midlandIci: {
      name: "midland_ici",
      baseUrl: "https://www.midlandici.com.hk",
      enabled: true,
      categories: [
        { type: "office", transactionType: "rent", path: "/en/list/office/rent" },
        { type: "office", transactionType: "sale", path: "/en/list/office/sale" },
        { type: "shop", transactionType: "rent", path: "/en/list/shop/rent" },
        { type: "shop", transactionType: "sale", path: "/en/list/shop/sale" },
        { type: "industrial", transactionType: "rent", path: "/en/list/industrial/rent" },
        { type: "industrial", transactionType: "sale", path: "/en/list/industrial/sale" },
      ],
    },
  },

  browser: {
    headless: true,
    timeout: 45000,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },

  schedule: {
    cron: "0 * * * *",
    timezone: "Asia/Hong_Kong",
  },
} as const;

export const DEFAULT_SCRAPE_OPTIONS: ScrapeOptions = {
  fullScan: false,
  maxPagesPerCategory: 15,
  delayBetweenRequests: 2500,
  maxDetailPages: 5,
};

export const FULL_SCAN_OPTIONS: ScrapeOptions = {
  fullScan: true,
  maxPagesPerCategory: 1000,
  delayBetweenRequests: 3000,
  maxDetailPages: 500,
};

export const DISTRICT_MAP: Record<string, string> = {
  "central": "Central",
  "sheung wan": "Sheung Wan",
  "wan chai": "Wan Chai",
  "admiralty": "Admiralty",
  "causeway bay": "Causeway Bay",
  "happy valley": "Happy Valley",
  "north point": "North Point",
  "fortress hill": "Fortress Hill",
  "quarry bay": "Quarry Bay",
  "sai wan ho": "Sai Wan Ho",
  "shau kei wan": "Shau Kei Wan",
  "chai wan": "Chai Wan",
  "aberdeen": "Aberdeen",
  "ap lei chau": "Ap Lei Chau",
  "wong chuk hang": "Wong Chuk Hang",
  "sai ying pun": "Sai Ying Pun",
  "shek tong tsui": "Shek Tong Tsui",
  "kennedy town": "Kennedy Town",
  "tin hau": "Tin Hau",
  "tai hang": "Tai Hang",
  "tsim sha tsui": "Tsim Sha Tsui",
  "jordan": "Jordan",
  "yau ma tei": "Yau Ma Tei",
  "mong kok": "Mong Kok",
  "mongkok": "Mong Kok",
  "prince edward": "Prince Edward",
  "hung hom": "Hung Hom",
  "to kwa wan": "To Kwa Wan",
  "san po kong": "San Po Kong",
  "wong tai sin": "Wong Tai Sin",
  "kowloon bay": "Kowloon Bay",
  "kwun tong": "Kwun Tong",
  "ngau tau kok": "Ngau Tau Kok",
  "yau tong": "Yau Tong",
  "tai kok tsui": "Tai Kok Tsui",
  "cheung sha wan": "Cheung Sha Wan",
  "lai chi kok": "Lai Chi Kok",
  "sham shui po": "Sham Shui Po",
  "ho man tin": "Ho Man Tin",
  "kwai chung": "Kwai Chung",
  "kwai fong": "Kwai Fong",
  "tsing yi": "Tsing Yi",
  "tsuen wan": "Tsuen Wan",
  "tuen mun": "Tuen Mun",
  "yuen long": "Yuen Long",
  "sheung shui": "Sheung Shui",
  "fan ling": "Fan Ling",
  "tai po": "Tai Po",
  "sha tin": "Sha Tin",
  "shatin": "Sha Tin",
  "fo tan": "Fo Tan",
  "fotan": "Fo Tan",
  "tai wai": "Tai Wai",
  "tung chung": "Tung Chung",
  "ma on shan": "Ma On Shan",
  "tseung kwan o": "Tseung Kwan O",
};

export const PROPERTY_TYPE_MAP: Record<string, string> = {
  "office": "office",
  "commercial office": "office",
  "grade a office": "office",
  "retail": "retail",
  "shop": "retail",
  "ground floor shop": "retail",
  "upstair shop": "retail",
  "shopping mall shop": "retail",
  "industrial": "industrial",
  "industrial building": "industrial",
  "warehouse": "warehouse",
  "factory": "industrial",
  "fnb": "fnb",
  "restaurant": "fnb",
  "catering": "fnb",
  "business": "retail",
};
