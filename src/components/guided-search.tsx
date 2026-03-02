"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Loader2,
  Camera,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GuidedFilters {
  districts?: string[];
  propertyTypes?: string[];
  minRent?: number;
  maxRent?: number;
  minArea?: number;
  maxArea?: number;
  nearMtrMaxMinutes?: number;
  willingToRenovate?: boolean;
  businessType?: string;
}

interface GuidedSearchProps {
  initialQuery?: string;
  initialImageFilters?: GuidedFilters;
}

export function GuidedSearch({ initialQuery, initialImageFilters }: GuidedSearchProps) {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState(initialQuery || "");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedChips, setSuggestedChips] = useState<string[]>([]);
  const [collectedFilters, setCollectedFilters] = useState<GuidedFilters | null>(
    initialImageFilters || null
  );
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibePreview, setVibePreview] = useState<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Start conversation
  useEffect(() => {
    if (chatMessages.length > 0) return;

    const startConversation = async () => {
      setChatLoading(true);
      let firstMessage = "Hi, I'd like to find a commercial space.";
      if (initialQuery) firstMessage = `I'm looking for: ${initialQuery}`;
      if (initialImageFilters) {
        const parts: string[] = [];
        if (initialImageFilters.districts?.length)
          parts.push(`Preferred districts: ${initialImageFilters.districts.join(", ")}`);
        if (initialImageFilters.propertyTypes?.length)
          parts.push(`Property types: ${initialImageFilters.propertyTypes.join(", ")}`);
        if (initialImageFilters.minRent || initialImageFilters.maxRent)
          parts.push(`Budget: HK$${initialImageFilters.minRent ?? 0}–${initialImageFilters.maxRent ?? "any"}/mo`);
        if (initialImageFilters.minArea || initialImageFilters.maxArea)
          parts.push(`Area: ${initialImageFilters.minArea ?? "any"}–${initialImageFilters.maxArea ?? "any"} sqft`);
        if (parts.length) firstMessage += ` From my inspiration image: ${parts.join("; ")}`;
      }

      const contextBlock = initialQuery || initialImageFilters
        ? { currentFilters: initialImageFilters || undefined }
        : undefined;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: firstMessage }],
            context: contextBlock,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setChatMessages([{ role: "assistant", content: data.message }]);
          if (data.suggestedChips?.length) setSuggestedChips(data.suggestedChips);
          if (data.filters) setCollectedFilters((prev) => ({ ...prev, ...data.filters }));
        } else {
          setChatMessages([
            {
              role: "assistant",
              content:
                "Hi! I'm here to help you find the right commercial space. What type of property are you looking for — office, retail, F&B, or something else?",
            },
          ]);
          setSuggestedChips(["Office in Central", "Retail in Causeway Bay", "F&B in Mong Kok"]);
        }
      } catch {
        setChatMessages([
          {
            role: "assistant",
            content:
              "Hi! Tell me what you need — property type, location, budget, or upload an inspiration image.",
          },
        ]);
        setSuggestedChips(["Office", "Retail", "F&B"]);
      } finally {
        setChatLoading(false);
      }
    };

    startConversation();
  }, [initialQuery, initialImageFilters]);

  const handleSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatInput("");
    setSuggestedChips([]);
    const updated = [...chatMessages, { role: "user" as const, content: msg }];
    setChatMessages(updated);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          context: { currentFilters: collectedFilters || undefined },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        if (data.suggestedChips?.length) setSuggestedChips(data.suggestedChips);
        if (data.filters)
          setCollectedFilters((prev) => ({ ...prev, ...data.filters }));
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Got it. What else can you tell me about your ideal space?" },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection issue. Try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleVibeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setVibeLoading(true);
    setVibePreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/ai/image-search", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok && data.filters) {
        setCollectedFilters((prev) => ({ ...prev, ...data.filters }));
        setChatMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: "[Uploaded an inspiration image]",
          },
          {
            role: "assistant",
            content:
              "I've analyzed your image and noted the style. I'll use this to find similar spaces. Any other requirements — MTR proximity, budget, or renovation preference?",
          },
        ]);
        setSuggestedChips(["Near MTR", "Within budget", "Ready to move in"]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Couldn't analyze the image. Try describing what you want instead." },
      ]);
    } finally {
      setVibeLoading(false);
      e.target.value = "";
    }
  };

  const generateShortlist = () => {
    const p = new URLSearchParams();
    p.set("shortlist", "1");
    if (collectedFilters?.districts?.length)
      p.set("districts", collectedFilters.districts.join(","));
    if (collectedFilters?.propertyTypes?.length)
      p.set("types", collectedFilters.propertyTypes.join(","));
    if (collectedFilters?.minRent) p.set("minRent", String(collectedFilters.minRent));
    if (collectedFilters?.maxRent) p.set("maxRent", String(collectedFilters.maxRent));
    if (collectedFilters?.minArea) p.set("minArea", String(collectedFilters.minArea));
    if (collectedFilters?.maxArea) p.set("maxArea", String(collectedFilters.maxArea));
    if (collectedFilters?.nearMtrMaxMinutes)
      p.set("nearMtr", String(collectedFilters.nearMtrMaxMinutes));
    router.push(`/search?${p.toString()}`);
  };

  const hasEnoughToSearch =
    (collectedFilters?.districts?.length ?? 0) > 0 ||
    (collectedFilters?.propertyTypes?.length ?? 0) > 0 ||
    (collectedFilters?.minRent ?? 0) > 0 ||
    (collectedFilters?.maxRent ?? 0) > 0 ||
    (collectedFilters?.minArea ?? 0) > 0 ||
    (collectedFilters?.maxArea ?? 0) > 0;

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Property Advisor</h2>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-xs text-gray-500">
              Tell me what you need — I&apos;ll ask follow-ups and build your shortlist
            </p>
            <Link
              href="/search"
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Browse all →
            </Link>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {chatMessages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Suggested chips */}
      {suggestedChips.length > 0 && !chatLoading && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
            {suggestedChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setChatInput(chip);
                  setSuggestedChips((prev) => prev.filter((c) => c !== chip));
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input + Image + Generate */}
      <div className="border-t border-gray-200 bg-gray-50/80 p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {/* Image upload inline */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleVibeImage}
              disabled={vibeLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={vibeLoading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {vibeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {vibeLoading ? "Analyzing..." : "Upload image"}
            </button>
            {vibePreview && (
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(vibePreview);
                  setVibePreview(null);
                }}
                className="flex items-center gap-1 rounded-lg bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Describe your needs, budget, location..."
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={chatLoading}
              className="flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {hasEnoughToSearch && (
            <button
              type="button"
              onClick={generateShortlist}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4" />
              Generate Shortlist
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
