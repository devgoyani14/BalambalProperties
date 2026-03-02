export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Star, Phone, Mail, Globe, MapPin } from "lucide-react";

const specialtyLabels: Record<string, string> = {
  commercial_lease: "Commercial Lease",
  "f&b_licensing": "F&B Licensing",
  residential_conveyancing: "Residential Conveyancing",
  commercial_conveyancing: "Commercial Conveyancing",
  tenancy_dispute: "Tenancy Dispute",
  property_litigation: "Property Litigation",
  stamp_duty: "Stamp Duty",
  mortgage: "Mortgage",
  title_search: "Title Search",
  lease_renewal: "Lease Renewal",
  subletting: "Subletting",
  rent_review: "Rent Review",
  due_diligence: "Due Diligence",
  regulatory_compliance: "Regulatory Compliance",
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-sm text-gray-400">No rating</span>;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < full
              ? "fill-amber-400 text-amber-400"
              : i === full && hasHalf
                ? "fill-amber-400/50 text-amber-400"
                : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default async function SolicitorsPage() {
  let solicitors: Awaited<ReturnType<typeof prisma.solicitor.findMany>> = [];
  try {
    solicitors = await prisma.solicitor.findMany({
      orderBy: { rating: "desc" },
    });
  } catch {
    // Table may not exist yet in production
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-b from-indigo-50/60 to-white px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Solicitor Directory
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Find trusted legal professionals for your property transaction
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {solicitors.length === 0 ? (
          <p className="text-center text-gray-500">
            No solicitors listed yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {solicitors.map((s) => (
              <article
                key={s.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {s.image ? (
                    <img
                      src={s.image}
                      alt={s.name}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-900">
                      {s.name}
                    </h2>
                    <p className="truncate text-sm text-gray-500">{s.firm}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <StarRating rating={s.rating} />
                  <span className="text-xs text-gray-400">
                    {s.reviewCount} review{s.reviewCount !== 1 && "s"}
                  </span>
                </div>

                {s.specialties.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.specialties.map((sp) => (
                      <span
                        key={sp}
                        className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                      >
                        {specialtyLabels[sp] ?? sp.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                {s.languages.length > 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">Languages:</span>{" "}
                    {s.languages.join(", ")}
                  </p>
                )}

                {s.district && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {s.district}
                  </p>
                )}

                {s.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">
                    {s.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-3 border-t border-gray-100 pt-4 mt-4">
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  )}
                  {s.website && (
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
