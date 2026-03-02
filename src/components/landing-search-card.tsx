"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Camera, Loader2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "rent", label: "Rent Office" },
  { id: "buy", label: "Buy Space" },
  { id: "coworking", label: "Coworking" },
];

function extractSearchKeywords(
  description: string,
  filters?: { propertyTypes?: string[]; districts?: string[] }
): string {
  const terms: string[] = [];
  if (filters?.propertyTypes?.length) {
    terms.push(...filters.propertyTypes);
  }
  const keywords = [
    "office", "retail", "cafe", "coworking", "industrial", "warehouse",
    "open plan", "open-plan", "natural light", "modern", "minimalist",
    "exposed", "renovated", "ground floor", "shop", "restaurant",
    "fnb", "studio", "creative", "design",
  ];
  const lower = (description || "").toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw) && !terms.includes(kw)) terms.push(kw);
  }
  return terms.slice(0, 5).join(" ").trim() || "";
}

export function LandingSearchCard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("rent");
  const [query, setQuery] = useState("");
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibePreview, setVibePreview] = useState<string | null>(null);
  const [vibeError, setVibeError] = useState<string | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("mode", "guided");
    if (activeTab !== "rent") params.set("type", activeTab);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleVibeImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setVibeError("Please upload an image (JPEG, PNG, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setVibeError("Image must be under 10MB");
      return;
    }

    setVibeError(null);
    setVibeLoading(true);
    setVibePreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ai/image-search", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setVibeError(data.error || "Failed to analyze image");
        return;
      }

      const p = new URLSearchParams();
      p.set("mode", "guided");
      const keywords = extractSearchKeywords(data.description ?? "", data.filters);
      if (keywords.trim()) p.set("q", keywords.trim());
      if (data.filters?.districts?.length)
        p.set("districts", data.filters.districts.join(","));
      if (data.filters?.propertyTypes?.length)
        p.set("types", data.filters.propertyTypes.join(","));
      if (data.filters?.minRent) p.set("minRent", String(data.filters.minRent));
      if (data.filters?.maxRent) p.set("maxRent", String(data.filters.maxRent));
      if (data.filters?.minArea) p.set("minArea", String(data.filters.minArea));
      if (data.filters?.maxArea) p.set("maxArea", String(data.filters.maxArea));

      router.push(`/search?${p.toString()}`);
    } catch {
      setVibeError("Connection error. Try again.");
    } finally {
      setVibeLoading(false);
      e.target.value = "";
    }
  };

  const clearVibePreview = () => {
    if (vibePreview) URL.revokeObjectURL(vibePreview);
    setVibePreview(null);
    setVibeError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold text-black">Start Your Search Today</h2>
      <p className="mt-1 text-sm text-gray-500">
        Describe what you need or upload an inspiration image
      </p>

      {/* Tabs */}
      <div className="mt-5 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#1e1b4b] text-white"
                : "bg-gray-100 text-black hover:bg-gray-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Natural-language search input */}
      <div className="mt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="e.g. &quot;Bright office in Central for 10 people&quot;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-black placeholder:text-gray-400 focus:border-[#1e1b4b] focus:outline-none focus:ring-1 focus:ring-[#1e1b4b]"
          />
        </div>
      </div>

      {/* Divider with "or" */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Vibe Image Upload */}
      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleVibeImageChange}
          disabled={vibeLoading}
        />
        {vibePreview ? (
          <div className="relative rounded-lg border-2 border-[#1e1b4b] overflow-hidden bg-gray-100">
            <img
              src={vibePreview}
              alt="Vibe preview"
              className="h-28 w-full object-cover"
            />
            {vibeLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-7 w-7 animate-spin text-white" />
                <span className="ml-2 text-sm text-white">Finding similar spaces...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={clearVibePreview}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={vibeLoading}
            className={cn(
              "flex w-full items-center gap-4 rounded-lg border-2 border-dashed px-5 py-4 transition-colors",
              vibeLoading
                ? "cursor-wait border-gray-200 bg-gray-50"
                : "border-gray-200 bg-gray-50 hover:border-[#1e1b4b] hover:bg-gray-100"
            )}
          >
            {vibeLoading ? (
              <Loader2 className="h-8 w-8 shrink-0 animate-spin text-[#1e1b4b]" />
            ) : (
              <Camera className="h-8 w-8 shrink-0 text-gray-400" />
            )}
            <div className="text-left">
              <span className="text-sm font-medium text-black">
                {vibeLoading ? "Analyzing your vibe..." : "Upload inspiration image"}
              </span>
              {!vibeLoading && (
                <span className="mt-0.5 block text-xs text-gray-500">
                  Photo, floor plan, or mood board
                </span>
              )}
            </div>
          </button>
        )}
        {vibeError && (
          <p className="mt-2 text-xs text-red-600">{vibeError}</p>
        )}
      </div>

      {/* Search Button */}
      <button
        type="button"
        onClick={handleSearch}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e1b4b] py-3 text-sm font-medium text-white transition-colors hover:bg-[#312e81]"
      >
        <Sparkles className="h-4 w-4" />
        Search with AI
      </button>
    </div>
  );
}
