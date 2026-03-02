"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  DollarSign,
  Ruler,
  Building,
  Clock,
  Zap,
} from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { cn, HK_DISTRICTS, PROPERTY_TYPES, formatCurrency, formatArea } from "@/lib/utils";

interface PropertyData {
  id: string;
  title: string;
  district: string;
  address: string;
  propertyType: string;
  monthlyRent: number | null;
  saleableArea: number | null;
  grossArea: number | null;
  price: number | null;
  images: string[];
  verificationScore: number;
  engagementScore: number;
  floor: string | null;
  aiScore: number | null;
  buildingGrade: string | null;
  sourceCount: number;
  suitabilityScore?: number;
}

interface SearchPageClientProps {
  properties: PropertyData[];
  total: number;
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
  hasAnyFilter: boolean;
  isShortlist?: boolean;
}

const QUICK_SEARCHES = [
  { label: "Offices in Central", districts: "Central", types: "office" },
  { label: "Shops in Causeway Bay", districts: "Causeway Bay", types: "retail" },
  { label: "F&B in Mong Kok", districts: "Mong Kok", types: "fnb" },
  { label: "Industrial in Kwun Tong", districts: "Kwun Tong", types: "industrial" },
  { label: "Offices in Wan Chai", districts: "Wan Chai", types: "office" },
  { label: "Retail in TST", districts: "Tsim Sha Tsui", types: "retail" },
];

const LISTING_TYPES = ["Buy", "Rent", "Mortgage"] as const;
const COMMERCIAL_USES = ["Office", "Retail", "F&B", "Warehouse", "Industrial", "Coworking"] as const;
const DURATIONS = ["< 1 year", "1-3 years", "3-5 years", "5+ years"] as const;

const WHAT_IF_SCENARIOS = [
  { id: "budget_up_20", label: "Increase budget 20%", icon: "💰", apply: (p: URLSearchParams) => { const m = Number(p.get("maxRent") || 0); if (m) p.set("maxRent", String(Math.round(m * 1.2))); } },
  { id: "budget_up_50", label: "Increase budget 50%", icon: "💸", apply: (p: URLSearchParams) => { const m = Number(p.get("maxRent") || 0); if (m) p.set("maxRent", String(Math.round(m * 1.5))); } },
  { id: "smaller", label: "Accept 20% smaller", icon: "📐", apply: (p: URLSearchParams) => { const m = Number(p.get("minArea") || 0); if (m) p.set("minArea", String(Math.round(m * 0.8))); } },
  { id: "any_type", label: "All property types", icon: "🔄", apply: (p: URLSearchParams) => { p.delete("types"); } },
  { id: "no_district", label: "Any district", icon: "🗺️", apply: (p: URLSearchParams) => { p.delete("districts"); } },
];

const gradeColor: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
};

export function SearchPageClient({
  properties,
  total,
  page,
  totalPages,
  params,
  hasAnyFilter,
  isShortlist = false,
}: SearchPageClientProps) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(!!params.openFilters);
  const [aiOpen, setAiOpen] = useState(false);
  const panelOpen = filterOpen || aiOpen;
  const setPanelOpen = (open: boolean) => {
    if (!open) {
      setFilterOpen(false);
      setAiOpen(false);
    } else {
      setFilterOpen(true);
      setAiOpen(false);
    }
  };
  const [whatIfExpanded, setWhatIfExpanded] = useState(false);

  // Filter state
  const currentDistricts = params.districts?.split(",").filter(Boolean) || [];
  const currentTypes = params.types?.split(",").filter(Boolean) || [];
  const [districts, setDistricts] = useState<string[]>(currentDistricts);
  const [types, setTypes] = useState<string[]>(currentTypes);
  const [listingType, setListingType] = useState("Rent");
  const [duration, setDuration] = useState("");
  const [minPrice, setMinPrice] = useState(params.minRent || "");
  const [maxPrice, setMaxPrice] = useState(params.maxRent || "");
  const [minArea, setMinArea] = useState(params.minArea || "");
  const [maxArea, setMaxArea] = useState(params.maxArea || "");
  const [fengShuiRated, setFengShuiRated] = useState(params.fengShuiRated === "1");
  const [minFengShui, setMinFengShui] = useState(params.minFengShui || "");
  const [location, setLocation] = useState(params.districts || "");

  // AI chat state
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [suggestedChips, setSuggestedChips] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search bar
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [isAiParsing, setIsAiParsing] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const [filtersSentToAi, setFiltersSentToAi] = useState(false);
  const initialFilterMessageRef = useRef<string | null>(null);

  async function handleSendToAi() {
    const parts: string[] = [];
    if (types.length) parts.push(`Property types: ${types.join(", ")}`);
    if (location) parts.push(`District: ${location}`);
    if (minPrice || maxPrice) parts.push(`Rent: HK$${minPrice || "0"} – ${maxPrice || "any"}/mo`);
    if (minArea || maxArea) parts.push(`Area: ${minArea || "0"} – ${maxArea || "any"} sqft`);
    if (listingType) parts.push(`Listing type: ${listingType}`);
    if (duration) parts.push(`Lease duration: ${duration}`);
    if (fengShuiRated) parts.push("Feng Shui rated only");
    if (minFengShui) parts.push(`Min Feng Shui score: ${minFengShui}`);

    const filterSummary = parts.length
      ? parts.join("\n")
      : "No specific filters selected yet.";

    setFiltersSentToAi(true);
    setChatLoading(true);

    try {
      const context = {
        currentFilters: {
          districts: location ? [location] : [],
          types,
          minRent: minPrice ? Number(minPrice) : undefined,
          maxRent: maxPrice ? Number(maxPrice) : undefined,
          minArea: minArea ? Number(minArea) : undefined,
          maxArea: maxArea ? Number(maxArea) : undefined,
        },
        resultCount: total,
        propertySummaries: properties.slice(0, 10).map((p) => ({
          id: p.id, title: p.title, district: p.district,
          propertyType: p.propertyType, monthlyRent: p.monthlyRent,
          saleableArea: p.saleableArea, floor: p.floor,
        })),
      };

      const openingMsg = `The user has selected these filters:\n${filterSummary}\n\nBased on these preferences, greet them briefly and ask 1-2 clarifying questions to help refine the search.`;
      initialFilterMessageRef.current = openingMsg;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: openingMsg }], context }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages([{ role: "assistant", content: data.message }]);
        if (data.suggestedChips?.length) setSuggestedChips(data.suggestedChips);
        if (data.filters) {
          const sp = new URLSearchParams();
          if (data.filters.districts?.length) sp.set("districts", data.filters.districts.join(","));
          if (data.filters.propertyTypes?.length) sp.set("types", data.filters.propertyTypes.join(","));
          if (data.filters.minRent) sp.set("minRent", String(data.filters.minRent));
          if (data.filters.maxRent) sp.set("maxRent", String(data.filters.maxRent));
          if (data.filters.minArea) sp.set("minArea", String(data.filters.minArea));
          if (data.filters.maxArea) sp.set("maxArea", String(data.filters.maxArea));
          setLastQuery(sp.toString());
        } else {
          const sp = new URLSearchParams();
          if (location) sp.set("districts", location);
          if (types.length) sp.set("types", types.join(","));
          if (minPrice) sp.set("minRent", minPrice);
          if (maxPrice) sp.set("maxRent", maxPrice);
          if (minArea) sp.set("minArea", minArea);
          if (maxArea) sp.set("maxArea", maxArea);
          setLastQuery(sp.toString());
        }
      } else {
        setChatMessages([{ role: "assistant", content: `Got it! I see you're looking for${types.length ? ` ${types.join("/")}` : ""} space${location ? ` in ${location}` : ""}. Any specific requirements I should know about?` }]);
        const sp = new URLSearchParams();
        if (location) sp.set("districts", location);
        if (types.length) sp.set("types", types.join(","));
        if (minPrice) sp.set("minRent", minPrice);
        if (maxPrice) sp.set("maxRent", maxPrice);
        if (minArea) sp.set("minArea", minArea);
        if (maxArea) sp.set("maxArea", maxArea);
        setLastQuery(sp.toString());
      }
    } catch {
      setChatMessages([{ role: "assistant", content: "I received your filters. What else can you tell me about your ideal space?" }]);
      const sp = new URLSearchParams();
      if (location) sp.set("districts", location);
      if (types.length) sp.set("types", types.join(","));
      if (minPrice) sp.set("minRent", minPrice);
      if (maxPrice) sp.set("maxRent", maxPrice);
      if (minArea) sp.set("minArea", minArea);
      if (maxArea) sp.set("maxArea", maxArea);
      setLastQuery(sp.toString());
    } finally {
      setChatLoading(false);
    }
  }


  const activeFilterCount =
    (currentDistricts.length > 0 ? 1 : 0) +
    (currentTypes.length > 0 ? 1 : 0) +
    (params.minRent || params.maxRent ? 1 : 0) +
    (params.minArea || params.maxArea ? 1 : 0) +
    (params.fengShuiRated || params.minFengShui ? 1 : 0);

  function applyFilters() {
    const p = new URLSearchParams();
    // Start with any AI-extracted filters
    if (lastQuery && lastQuery.includes("=")) {
      const aiParams = new URLSearchParams(lastQuery);
      aiParams.forEach((v, k) => p.set(k, v));
    }
    // Manual filters override AI-extracted ones
    if (location) p.set("districts", location);
    if (minPrice) p.set("minRent", minPrice);
    if (maxPrice) p.set("maxRent", maxPrice);
    if (minArea) p.set("minArea", minArea);
    if (maxArea) p.set("maxArea", maxArea);
    if (fengShuiRated) p.set("fengShuiRated", "1");
    if (minFengShui) p.set("minFengShui", minFengShui);
    const useTypes = types.length ? types : [];
    if (useTypes.length) p.set("types", useTypes.join(","));
    if (params.sort) p.set("sort", params.sort);
    if (params.q) p.set("q", params.q);
    router.push(`/search?${p.toString()}`);
    setPanelOpen(false);
  }

  function clearFilters() {
    setDistricts([]);
    setTypes([]);
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
    setFengShuiRated(false);
    setMinFengShui("");
    setLocation("");
    setDuration("");
    setChatMessages([]);
    setSuggestedChips([]);
    setLastQuery("");
    setFiltersSentToAi(false);
    initialFilterMessageRef.current = null;
  }

  function handleQuickSearch(q: { districts: string; types: string }) {
    const p = new URLSearchParams();
    if (q.districts) p.set("districts", q.districts);
    if (q.types) p.set("types", q.types);
    router.push(`/search?${p.toString()}`);
    setPanelOpen(false);
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsAiParsing(true);
    try {
      const res = await fetch("/api/ai/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (res.ok) {
        const parsed = await res.json();
        const p = new URLSearchParams();
        p.set("q", searchQuery);
        if (parsed.filters?.districts?.length) p.set("districts", parsed.filters.districts.join(","));
        if (parsed.filters?.propertyTypes?.length) p.set("types", parsed.filters.propertyTypes.join(","));
        if (parsed.filters?.minRent) p.set("minRent", String(parsed.filters.minRent));
        if (parsed.filters?.maxRent) p.set("maxRent", String(parsed.filters.maxRent));
        if (parsed.filters?.minArea) p.set("minArea", String(parsed.filters.minArea));
        if (parsed.filters?.maxArea) p.set("maxArea", String(parsed.filters.maxArea));
        router.push(`/search?${p.toString()}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
    } catch {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    } finally {
      setIsAiParsing(false);
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setSuggestedChips([]);

    const baseMessages = initialFilterMessageRef.current
      ? [
          { role: "user" as const, content: initialFilterMessageRef.current },
          ...chatMessages,
        ]
      : [...chatMessages];
    const updatedMessages: { role: "user" | "assistant"; content: string }[] = [
      ...baseMessages,
      { role: "user" as const, content: msg },
    ];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const districts = location ? location.split(",").map((d) => d.trim()).filter(Boolean) : [];
      const context = {
        currentFilters: {
          districts: districts.length ? districts : currentDistricts,
          types: types.length ? types : currentTypes,
          minRent: minPrice ? Number(minPrice) : (params.minRent ? Number(params.minRent) : undefined),
          maxRent: maxPrice ? Number(maxPrice) : (params.maxRent ? Number(params.maxRent) : undefined),
          minArea: minArea ? Number(minArea) : (params.minArea ? Number(params.minArea) : undefined),
          maxArea: maxArea ? Number(maxArea) : (params.maxArea ? Number(params.maxArea) : undefined),
        },
        resultCount: total,
        propertySummaries: properties.slice(0, 10).map((p) => ({
          id: p.id, title: p.title, district: p.district,
          propertyType: p.propertyType, monthlyRent: p.monthlyRent,
          saleableArea: p.saleableArea, floor: p.floor,
        })),
      };

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, context }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        if (data.suggestedChips?.length) setSuggestedChips(data.suggestedChips);

        if (data.filters) {
          const sp = new URLSearchParams();
          if (data.filters.districts?.length) sp.set("districts", data.filters.districts.join(","));
          if (data.filters.propertyTypes?.length) sp.set("types", data.filters.propertyTypes.join(","));
          if (data.filters.minRent) sp.set("minRent", String(data.filters.minRent));
          if (data.filters.maxRent) sp.set("maxRent", String(data.filters.maxRent));
          if (data.filters.minArea) sp.set("minArea", String(data.filters.minArea));
          if (data.filters.maxArea) sp.set("maxArea", String(data.filters.maxArea));
          setLastQuery(sp.toString());
        }
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong — could you try again?" }]);
        setSuggestedChips(["Office", "Retail", "F&B", "Warehouse"]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Connection issue. Try again." }]);
      setSuggestedChips(["Office", "Retail", "F&B", "Warehouse"]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatSearch() {
    if (lastQuery.includes("=")) {
      router.push(`/search?${lastQuery}`);
    } else if (lastQuery) {
      router.push(`/search?q=${encodeURIComponent(lastQuery)}`);
    }
    setPanelOpen(false);
  }

  function applyFengShuiFromDropdown(rated: boolean, minScore: string) {
    setFengShuiRated(rated);
    setMinFengShui(minScore);
    const p = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])
    );
    if (rated) p.set("fengShuiRated", "1"); else p.delete("fengShuiRated");
    if (minScore) p.set("minFengShui", minScore); else p.delete("minFengShui");
    router.push(`/search?${p.toString()}`);
  }

  function handleWhatIf(scenarioId: string) {
    const scenario = WHAT_IF_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) p.set(k, v);
    }
    scenario.apply(p);
    router.push(`/search?${p.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Sticky Top Bar ─── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3 py-3">
            {/* Filters & AI Panel Button */}
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline text-primary">AI</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by location, type, or describe what you need..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-24 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAiParsing}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isAiParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isAiParsing ? "Parsing..." : "Search"}
              </button>
            </form>

          </div>

          {/* Active Filters + Sort */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            <span className="text-xs text-gray-400 flex-shrink-0">
              {total} {total === 1 ? "property" : "properties"}
            </span>
            <span className="text-gray-200">|</span>

            {/* Sort pills */}
            {[
              { value: "score", label: "Popular" },
              { value: "price_asc", label: "Price ↑" },
              { value: "price_desc", label: "Price ↓" },
              { value: "area_desc", label: "Largest" },
              { value: "recent", label: "Newest" },
            ].map((s) => {
              const currentSort = params.sort || "score";
              const isActive = currentSort === s.value;
              const newParams = new URLSearchParams(
                Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])
              );
              newParams.set("sort", s.value);
              return (
                <Link
                  key={s.value}
                  href={`/search?${newParams.toString()}`}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors flex-shrink-0 ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}

            {/* Feng Shui Toggle */}
            <span className="text-gray-200">|</span>
            <button
              onClick={() => applyFengShuiFromDropdown(!fengShuiRated, fengShuiRated ? "" : minFengShui)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium transition-colors flex-shrink-0",
                fengShuiRated
                  ? "bg-violet-600 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              )}
            >
              <span className="text-[13px] leading-none">&#9765;</span>
              Feng Shui
            </button>

            {/* Active filter tags */}
            {currentDistricts.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 flex-shrink-0">
                {currentDistricts.join(", ")}
              </span>
            )}
            {currentTypes.length > 0 && (
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 flex-shrink-0">
                {currentTypes.join(", ")}
              </span>
            )}
            {(params.minRent || params.maxRent) && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 flex-shrink-0">
                {params.minRent ? `$${Number(params.minRent).toLocaleString()}` : "$0"} – {params.maxRent ? `$${Number(params.maxRent).toLocaleString()}` : "any"}
              </span>
            )}
            {(params.fengShuiRated || params.minFengShui) && (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 flex-shrink-0">
                Feng Shui{params.minFengShui ? ` ${params.minFengShui}+` : " rated"}
              </span>
            )}
            {hasAnyFilter && (
              <Link
                href="/search"
                className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
              >
                Clear all ×
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── What If Bar (only if filters are active) ─── */}
      {hasAnyFilter && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-800 flex-shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
                What if...
              </span>
              {(whatIfExpanded ? WHAT_IF_SCENARIOS : WHAT_IF_SCENARIOS.slice(0, 3)).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleWhatIf(s.id)}
                  className="flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition-colors flex-shrink-0"
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
              {WHAT_IF_SCENARIOS.length > 3 && (
                <button
                  onClick={() => setWhatIfExpanded(!whatIfExpanded)}
                  className="flex items-center gap-0.5 text-[11px] font-medium text-amber-600 hover:text-amber-800 flex-shrink-0"
                >
                  {whatIfExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {whatIfExpanded ? "Less" : "More"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Shortlist Header ─── */}
      {isShortlist && properties.length > 0 && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  Your Shortlist
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Top {properties.length} matches ranked by suitability
                </p>
              </div>
              <Link
                href="/search?mode=guided"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Refine with AI →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Property Grid ─── */}
      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold text-black">No properties found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md">
            Try adjusting your filters, broadening your search, or use our AI advisor for help.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/search"
              className="rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Clear Filters
            </Link>
            <button
              onClick={() => setPanelOpen(true)}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ask AI Advisor
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <div key={property.id} className="relative group">
                <PropertyCard
                  id={property.id}
                  title={property.title}
                  district={property.district}
                  address={property.address}
                  propertyType={property.propertyType}
                  monthlyRent={property.monthlyRent}
                  saleableArea={property.saleableArea}
                  grossArea={property.grossArea}
                  price={property.price}
                  images={property.images}
                  verificationScore={property.verificationScore}
                  engagementScore={property.engagementScore}
                  floor={property.floor}
                  sourceCount={property.sourceCount}
                />
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[1] pointer-events-none">
                  {(property.suitabilityScore != null || property.aiScore != null) && (
                    <span className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-xs font-medium text-amber-400 backdrop-blur">
                      <Sparkles className="h-3 w-3" />
                      {property.suitabilityScore ?? property.aiScore}/100
                    </span>
                  )}
                  {property.buildingGrade && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColor[property.buildingGrade] || "bg-gray-100 text-gray-600"}`}>
                      Grade {property.buildingGrade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !isShortlist && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/search?${(() => { const p = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])); p.set("page", String(page - 1)); return p.toString(); })()}`}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/search?${(() => { const p = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])); p.set("page", String(page + 1)); return p.toString(); })()}`}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Filters & AI Panel (slide from left) ─── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setPanelOpen(false)}>
          <div className="absolute inset-0 bg-black/30 animate-in fade-in duration-200" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[min(720px,95vw)] bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-black">
                  <SlidersHorizontal className="h-5 w-5" />
                  Filters
                  <span className="text-gray-300">|</span>
                  <MessageSquare className="h-5 w-5 text-primary" />
                  AI Advisor
                </h2>
                <button onClick={() => setPanelOpen(false)} className="rounded-full p-1 hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              {filtersSentToAi && (
                <div className="px-5 pb-3">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Search for Property Listings
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">
              {/* Left: Filters */}
              <div className="w-full sm:w-[340px] flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Quick Searches */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <Zap className="h-3.5 w-3.5" /> Quick Searches
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SEARCHES.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => handleQuickSearch(q)}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Listing Type */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <DollarSign className="h-3.5 w-3.5" /> Listing Type
                </label>
                <div className="flex gap-2">
                  {LISTING_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setListingType(t)}
                      className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", listingType === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <Building className="h-3.5 w-3.5" /> Property Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMERCIAL_USES.map((u) => {
                    const val = u.toLowerCase();
                    const active = types.includes(val);
                    return (
                      <button key={u} type="button"
                        onClick={() => setTypes(active ? types.filter((v) => v !== val) : [...types, val])}
                        className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* District */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <MapPin className="h-3.5 w-3.5" /> District
                </label>
                <input type="text" placeholder="e.g. Central, Wan Chai, Kwun Tong..."
                  value={location} onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none" />
              </div>

              {/* Price Range */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <DollarSign className="h-3.5 w-3.5" /> Monthly Rent (HKD)
                </label>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none" />
                  <span className="text-gray-300">–</span>
                  <input type="text" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none" />
                </div>
              </div>

              {/* Floor Area */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <Ruler className="h-3.5 w-3.5" /> Floor Area (sqft)
                </label>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Min" value={minArea} onChange={(e) => setMinArea(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none" />
                  <span className="text-gray-300">–</span>
                  <input type="text" placeholder="Max" value={maxArea} onChange={(e) => setMaxArea(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none" />
                </div>
              </div>

              {/* Feng Shui */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <Sparkles className="h-3.5 w-3.5" /> Feng Shui
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={fengShuiRated}
                      onChange={(e) => setFengShuiRated(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                    />
                    Only show Feng Shui rated properties
                  </label>
                  <select
                    value={minFengShui}
                    onChange={(e) => setMinFengShui(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">Any Feng Shui score</option>
                    <option value="60">60+ (Fair)</option>
                    <option value="70">70+ (Good)</option>
                    <option value="80">80+ (Excellent)</option>
                  </select>
                </div>
              </div>

              {/* Lease Duration */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <Clock className="h-3.5 w-3.5" /> Lease Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setDuration(duration === d ? "" : d)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", duration === d ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
                </div>

                {/* Send to AI */}
                <div className="border-t border-gray-200 bg-white px-5 py-4 flex gap-2 flex-shrink-0">
                  <button type="button" onClick={clearFilters}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                    Clear
                  </button>
                  <button type="button" onClick={handleSendToAi} disabled={chatLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50">
                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Send to AI
                  </button>
                </div>
              </div>

              {/* Right: AI Advisor */}
              <div className="flex-1 flex flex-col min-w-0 min-h-[280px] bg-gray-50/50">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="mt-4 text-sm font-semibold text-black">AI Property Advisor</h4>
                  <p className="mt-1 max-w-[260px] text-xs text-gray-400">
                    {filtersSentToAi
                      ? "Starting AI advisor..."
                      : "Select filters and click \"Send to AI\", or start chatting to describe what you need."}
                  </p>
                  {!filtersSentToAi && (
                    <button
                      type="button"
                      onClick={handleSendToAi}
                      disabled={chatLoading}
                      className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      Start chatting
                    </button>
                  )}
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] rounded-xl px-4 py-2.5 text-sm",
                  msg.role === "user" ? "ml-auto bg-gray-900 text-white" : "bg-gray-100 text-gray-700")}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              ))}
              {suggestedChips.length > 0 && !chatLoading && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestedChips.map((chip) => (
                    <button key={chip} onClick={() => setChatInput(chip)}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-primary hover:text-primary transition-colors">
                      {chip}
                    </button>
                  ))}
                </div>
              )}
              {chatLoading && (
                <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-400 max-w-[85%]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Parsing...
                </div>
              )}
                  <div ref={chatEndRef} />
                </div>

                <div className="border-t border-gray-200 bg-white px-5 py-4 space-y-3 flex-shrink-0">
                  {filtersSentToAi ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                        placeholder="Ask a follow-up or add more details..."
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-black placeholder:text-gray-400 focus:border-gray-400 focus:outline-none" />
                      <button type="button" onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-40">
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="py-2 text-center text-xs text-gray-400">
                      Select filters and click <span className="font-semibold text-gray-600">&quot;Send to AI&quot;</span> to start
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
