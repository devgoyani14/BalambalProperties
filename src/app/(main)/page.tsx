export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Brain,
  Building2,
  BarChart3,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react";
import { LandingSearchCard } from "@/components/landing-search-card";
import { FeaturedProperties } from "@/components/featured-properties";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const TYPE_PLACEHOLDERS: Record<string, string> = {
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
  industrial: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop",
  warehouse: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop",
  fnb: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
};

function getPropertyImage(images: string[], propertyType: string): string {
  const valid = images.filter(
    (img) => img.startsWith("http") && !img.includes("loadingphoto") && !img.includes("placeholder")
  );
  return valid[0] || TYPE_PLACEHOLDERS[propertyType] || TYPE_PLACEHOLDERS.office;
}

async function getHotProperties() {
  try {
    return await prisma.property.findMany({
      where: { status: "active" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 10,
    });
  } catch {
    return [];
  }
}

async function getFeaturedProperties() {
  try {
    return await prisma.property.findMany({
      where: { status: "active" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    });
  } catch {
    return [];
  }
}

async function getPropertyStats() {
  try {
    const [total, sources] = await Promise.all([
      prisma.property.count({ where: { status: "active" } }),
      prisma.sourceListing.groupBy({ by: ["source"], _count: true }),
    ]);
    return { total, sourceCount: sources.length };
  } catch {
    return { total: 0, sourceCount: 0 };
  }
}


export default async function HomePage() {
  const [hotProperties, featuredProperties, stats] = await Promise.all([
    getHotProperties(),
    getFeaturedProperties(),
    getPropertyStats(),
  ]);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-20">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Property Search
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Work{" "}
              <span className="italic text-indigo-600">Smarter</span>
              <br />
              Find Your Space.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-500">
              Discover verified SME office spaces, get expert guidance, and move
              in with ease. Multimodal search powered by AI.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/search?view=results"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg"
              >
                Browse Properties
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-sm text-gray-400">
                {stats.total > 0
                  ? `${stats.total.toLocaleString()} listings from ${stats.sourceCount} sources`
                  : "New listings daily"}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 lg:w-[400px]">
            <LandingSearchCard />
          </div>
        </div>
      </section>

      {/* Hot Properties Carousel */}
      {hotProperties.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50/50 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Hot Properties
                  </h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Trending listings with highest engagement this week
                </p>
              </div>
              <Link
                href="/search"
                className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="-mx-6 mt-8 flex gap-5 overflow-x-auto px-6 pb-4 scrollbar-hide lg:-mx-8 lg:px-8">
              {hotProperties.map((property) => (
                <Link
                  key={property.id}
                  href={`/property/${property.id}`}
                  className="group w-[300px] flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-lg hover:ring-gray-300"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={getPropertyImage(property.images, property.propertyType)}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <span className="rounded-md bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                        <TrendingUp className="mr-1 inline h-3 w-3" />
                        Hot
                      </span>
                      <div className="flex gap-1.5">
                        {property.aiScore != null && (
                          <span className="flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-indigo-700 backdrop-blur-sm">
                            <Brain className="h-3 w-3" />
                            {property.aiScore}
                          </span>
                        )}
                        {property.buildingGrade && (
                          <span className="flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-gray-700 backdrop-blur-sm">
                            <Building2 className="h-3 w-3" />
                            {property.buildingGrade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold leading-tight text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {property.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{property.district}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <p className="text-lg font-bold text-gray-900">
                        {property.monthlyRent
                          ? formatCurrency(property.monthlyRent)
                          : property.price
                            ? formatCurrency(property.price)
                            : "Price on ask"}
                        {property.monthlyRent ? (
                          <span className="text-sm font-normal text-gray-400">
                            /mo
                          </span>
                        ) : property.price ? (
                          <span className="text-sm font-normal text-gray-400">
                            {" "}sale
                          </span>
                        ) : null}
                      </p>
                      <span className="text-xs font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                        View &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 text-center sm:hidden">
              <Link
                href="/search"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600"
              >
                View all properties
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-8 py-14 text-center shadow-xl sm:px-16">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBoMnYyMGgtMlY0em0tNCAxNmgxMnYySDMydi0yem0tOCA4aDEydjJIMjR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Start Searching for Properties
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100">
                Browse hundreds of verified commercial spaces across Hong Kong.
                AI-powered matching finds your perfect fit in seconds.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl"
                >
                  Start Searching
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/search?view=results"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
                >
                  Browse All Listings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="bg-white">
        <FeaturedProperties properties={featuredProperties} />
      </section>

      {/* Bottom trust bar */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="text-center">
              <Shield className="mx-auto h-6 w-6 text-indigo-600" />
              <p className="mt-2 text-sm font-semibold text-gray-900">
                Verified Listings
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Evidence-backed data
              </p>
            </div>
            <div className="text-center">
              <Brain className="mx-auto h-6 w-6 text-indigo-600" />
              <p className="mt-2 text-sm font-semibold text-gray-900">
                AI Matching
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Smart recommendations
              </p>
            </div>
            <div className="text-center">
              <Building2 className="mx-auto h-6 w-6 text-indigo-600" />
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {stats.total > 0 ? `${stats.total.toLocaleString()}+ Spaces` : "500+ Spaces"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Across Hong Kong
              </p>
            </div>
            <div className="text-center">
              <BarChart3 className="mx-auto h-6 w-6 text-indigo-600" />
              <p className="mt-2 text-sm font-semibold text-gray-900">
                Market Data
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Real-time insights
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
