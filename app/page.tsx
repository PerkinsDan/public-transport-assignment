import { Suspense } from "react";
import PunctualityChart from "@/components/charts/PunctualityChart";
import DelayBreakdownChart from "@/components/charts/DelayBreakdownChart";
import WorstRoutesChart from "@/components/charts/WorstRoutesChart";
import WorstSectionsOverallChart from "@/components/charts/WorstSectionsOverallChart";
import WorstSectionsPerRouteChart from "@/components/charts/WorstSectionsPerRouteChart";
import RouteMapWrapper from "@/components/maps/RouteMapWrapper";
import OperatorFilter from "@/components/OperatorFilter";
import { getDelayBreakdownData, getOperators, getPunctualityData, getRouteMapData, getSectionsByRoute } from "@/lib/transport/data";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { operator: operatorParam } = await searchParams;
  const selectedOperator = typeof operatorParam === "string" ? operatorParam : "";

  const [punctualityData, routeMapData, delayBreakdownData, sectionsByRoute, operators] = await Promise.all([
    getPunctualityData(),
    getRouteMapData(),
    getDelayBreakdownData(),
    getSectionsByRoute(),
    getOperators(),
  ]);

  const selectedOp = operators.find((o) => o.name === selectedOperator);
  const routeFilter = selectedOp ? new Set(selectedOp.route_names) : null;

  const filteredPunctuality = routeFilter
    ? punctualityData.filter((d) => routeFilter.has(d.route_name))
    : punctualityData;
  const filteredRouteMap = routeFilter
    ? routeMapData.filter((d) => routeFilter.has(d.route_name))
    : routeMapData;
  const filteredSections = routeFilter
    ? sectionsByRoute.filter((d) => routeFilter.has(d.route_name))
    : sectionsByRoute;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Transport Operations
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Real-time monitoring and analytics dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Suspense fallback={<div className="w-48 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />}>
                <OperatorFilter operators={operators} selected={selectedOperator} />
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-8">
        {/* Summary Stats Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Routes Card */}
            <div className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Routes</span>
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{filteredPunctuality.length}</div>
              </div>
            </div>

            {/* Average Delay Card */}
            <div className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Average Delay</span>
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-.707.707a1 1 0 101.414 1.414L9 9.414V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {filteredPunctuality.length > 0
                    ? (filteredPunctuality.reduce((sum, d) => sum + d.avg_delay_minutes, 0) / filteredPunctuality.length).toFixed(1)
                    : "0"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">minutes</div>
              </div>
            </div>

          </div>
        </div>

        {/* Charts & Maps Grid Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-4">
            Analysis
          </h2>
          <div className="space-y-6">
            {/* Chart */}
            <div>
              <PunctualityChart data={filteredPunctuality} />
            </div>

            {/* Map - Full Width */}
            <div>
              <RouteMapWrapper data={filteredRouteMap} />
            </div>
          </div>
        </div>

        {/* Additional Insights Section */}
        <div className="mt-8 pt-6 sm:mt-12 sm:pt-8 border-t border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-4">
            Additional Insights
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DelayBreakdownChart data={delayBreakdownData} />
            <WorstRoutesChart data={filteredPunctuality} />
          </div>
        </div>

        {/* Section Analysis */}
        <div className="mt-8 pt-6 sm:mt-12 sm:pt-8 border-t border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-4">
            Section Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorstSectionsOverallChart data={filteredSections} />
            <WorstSectionsPerRouteChart data={filteredSections} />
          </div>
        </div>
      </main>
    </div>
  );
}
