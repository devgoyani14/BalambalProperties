"use client";

import { TrendingUp, TrendingDown, BarChart3, Clock, Lightbulb, Building2 } from "lucide-react";

const interestRateHistory = [
  { year: "2019", rate: 5.125 },
  { year: "2020", rate: 5.0 },
  { year: "2021", rate: 5.0 },
  { year: "2022", rate: 5.375 },
  { year: "2023", rate: 5.875 },
  { year: "2024", rate: 5.875 },
  { year: "2025", rate: 5.75 },
  { year: "2026", rate: 5.625 },
];

const districtData = [
  { district: "Central", avgRent: 65, yoy: -3.2, vacancy: 12.1, type: "Office" },
  { district: "Admiralty", avgRent: 58, yoy: -1.8, vacancy: 9.5, type: "Office" },
  { district: "Wan Chai", avgRent: 42, yoy: 1.4, vacancy: 7.3, type: "Office" },
  { district: "Tsim Sha Tsui", avgRent: 120, yoy: 2.8, vacancy: 5.2, type: "Retail" },
  { district: "Causeway Bay", avgRent: 145, yoy: -0.5, vacancy: 6.8, type: "Retail" },
  { district: "Mong Kok", avgRent: 95, yoy: 3.1, vacancy: 4.1, type: "Retail" },
  { district: "Kwun Tong", avgRent: 28, yoy: 5.2, vacancy: 8.9, type: "Office" },
  { district: "Sheung Wan", avgRent: 38, yoy: 0.7, vacancy: 10.2, type: "Office" },
];

const propertyTrends = [
  { type: "Grade A Office", trend: "down", note: "Rents declining as supply increases in CBD" },
  { type: "Grade B Office", trend: "stable", note: "Steady demand from SMEs and startups" },
  { type: "Retail — High Street", trend: "up", note: "Tourist recovery driving rental growth" },
  { type: "Retail — Mall", trend: "stable", note: "Normalising after post-COVID rebound" },
  { type: "Industrial / F&B", trend: "up", note: "Strong demand, limited new supply" },
];

const takeaways = [
  "Grade A office rents in Central are at a 5-year low — good entry point for tenants.",
  "Retail rents in tourist districts are rebounding but remain 20% below 2018 peaks.",
  "Interest rates appear to have peaked; potential easing expected in H2 2026.",
  "Kowloon East (Kwun Tong) offers the best value-for-money in office space.",
  "Vacancy rates above 10% in core CBD give tenants strong negotiating leverage.",
];

function BarChart({ data }: { data: typeof interestRateHistory }) {
  const max = Math.max(...data.map((d) => d.rate));
  const min = Math.min(...data.map((d) => d.rate)) - 0.5;
  const range = max - min;
  return (
    <div className="flex gap-2 h-48">
      {data.map((d) => {
        const pct = ((d.rate - min) / range) * 100;
        const isCurrent = d.year === "2026";
        return (
          <div key={d.year} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold text-gray-700">{d.rate}%</span>
            <div className="flex-1 flex items-end w-full">
              <div
                className={`w-full rounded-t-md transition-all ${isCurrent ? "bg-indigo-600" : "bg-indigo-300"}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className={`text-xs ${isCurrent ? "font-bold text-indigo-700" : "text-gray-500"}`}>
              {d.year}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <TrendingUp className="h-3 w-3" /> Rising
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
        <TrendingDown className="h-3 w-3" /> Declining
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      — Stable
    </span>
  );
}

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-indigo-50/60 to-white px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Market Dynamics &amp; Insights
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Data-driven analysis of Hong Kong&apos;s commercial property market
        </p>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Prime Rate", value: "5.625%", sub: "HKMA, Feb 2026" },
            { label: "Avg Office Rent (Central)", value: "HK$65/sqft", sub: "YoY -3.2%" },
            { label: "Avg Retail Rent (TST)", value: "HK$120/sqft", sub: "YoY +2.8%" },
            { label: "CBD Vacancy", value: "12.1%", sub: "Highest since 2020" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {s.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="mt-1 text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Interest Rate Trend */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              HK Prime Rate Trend
            </h2>
          </div>
          <BarChart data={interestRateHistory} />
          <p className="mt-4 text-sm text-gray-500">
            The prime rate appears to have peaked at 5.875% in 2023-24 and has started a gradual descent.
            Analysts expect further easing in H2 2026 if US Fed cuts materialise.
          </p>
        </section>

        {/* Market timing */}
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Is Now a Good Time to Lease?
            </h2>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
              Favourable for Tenants
            </span>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>Office market:</strong> Elevated vacancy rates (10–12% in core CBD) give tenants
              significant leverage. Landlords are offering rent-free periods and fit-out contributions
              not seen since 2020.
            </p>
            <p>
              <strong>Retail market:</strong> Tourist-driven districts are recovering, but rents remain
              well below pre-pandemic highs. Negotiate now before the tourism uplift cycle matures.
            </p>
            <p>
              <strong>Interest rates:</strong> With rates easing, financing costs for property purchases
              will likely improve through 2026, making it an attractive window for buyers.
            </p>
          </div>
        </section>

        {/* District comparison */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              District Comparison — Average Rent per Sqft
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-medium text-gray-500">District</th>
                  <th className="pb-3 font-medium text-gray-500">Type</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Avg Rent/sqft</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">YoY Change</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Vacancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {districtData.map((d) => (
                  <tr key={d.district}>
                    <td className="py-3 font-medium text-gray-900">{d.district}</td>
                    <td className="py-3 text-gray-500">{d.type}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      HK${d.avgRent}
                    </td>
                    <td
                      className={`py-3 text-right font-medium ${
                        d.yoy > 0 ? "text-green-600" : d.yoy < 0 ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {d.yoy > 0 ? "+" : ""}
                      {d.yoy}%
                    </td>
                    <td className="py-3 text-right text-gray-600">{d.vacancy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Property type trends */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Property Type Trends
          </h2>
          <div className="divide-y divide-gray-100">
            {propertyTrends.map((t) => (
              <div key={t.type} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{t.type}</p>
                  <p className="text-sm text-gray-500">{t.note}</p>
                </div>
                <TrendBadge trend={t.trend} />
              </div>
            ))}
          </div>
        </section>

        {/* Key takeaways */}
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Key Takeaways</h2>
          </div>
          <ul className="space-y-2">
            {takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
