
import React, { useEffect, useState } from 'react';


import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { AlertTriangle, Activity } from 'lucide-react';

import { getFloodStats } from '../api/floodApi';

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatArea = (value) => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return '—';

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatSignedArea = (value) => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return '—';

  return `${numeric > 0 ? '+' : ''}${formatArea(numeric)}`;
};

const formatPercent = (value) => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return '—';

  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
};


function MetricCard({
  label,
  value,
  accent = 'text-white',
  unit = 'km²',
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#1e2d4a] bg-[#112240] p-4">
      <div className="mb-1 text-xs uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className={`break-words text-xl font-bold ${accent}`}>
        {value}

        {unit && (
          <span className="ml-1 text-xs font-normal text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}


const StatsPanel = ({ event }) => {


  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStats(null);
      setError('');
      setLoading(true);

      try {
        const result = await getFloodStats(event?.id);

        if (!cancelled) {
          setStats(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load district statistics.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [event?.id]);

  if (loading) {
    return (
      <div
        className="h-40 animate-pulse rounded-xl bg-[#1e2d4a]"
        aria-label="Loading district statistics"
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-[#0a192f] p-6 text-white">
        <div className="mb-2 flex items-center gap-2 font-semibold text-red-300">
          <AlertTriangle className="h-5 w-5" />
          Statistics could not be loaded
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          {error}
        </p>

        <p className="mt-3 break-all text-xs text-slate-500">
          {event?.id === 'sylhet-2022'
              ? '/data/floodsar/2022/sylhet/stats_sylhet.json'
              : '/data/floodsar/2024/district_summary.json'}
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-[#1e2d4a] bg-[#0a192f] p-6 text-white">
        <h3 className="font-semibold">
          Real statistics unavailable
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Audited satellite-derived summaries are available for
          Feni and Noakhali (August 2024) and Sylhet (June 2022).
          This event does not yet have a prepared summary, and no
          sample measurements are displayed.
        </p>
      </div>
    );
  }

  // Sylhet has summary-level statistics, not a district-by-district array.
  // Render its own fields before the Feni-Noakhali panel below.
  if (event?.id === 'sylhet-2022') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#0a192f] p-6 shadow-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold tracking-wider text-cyan-300">
          <Activity className="h-3.5 w-3.5" />
          SYLHET 2022 - SATELLITE ANALYSIS
        </div>

        <h2 className="text-2xl font-black text-white md:text-3xl">
          Sylhet flood comparison
        </h2>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-slate-400">
          Comparison date: {stats.comparison_date || '2022-06-18'}. Areas are reported in square kilometres. Candidate transitions are exploratory radar changes, not confirmed flood extent.
        </p>

        <h3 className="mb-3 text-sm font-semibold text-white">Study area and reference measurements</h3>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Rasterized district area" value={formatArea(stats.district_area_km2)} />
          <MetricCard label="Candidate transition valid area" value={formatArea(stats.candidate_transition_valid_area_km2)} />
          <MetricCard label="Strict evaluation area" value={formatArea(stats.strict_evaluation_area_km2)} />
          <MetricCard label="GFM flood reference area (strict)" value={formatArea(stats.gfm_flood_strict_area_km2)} />
          <MetricCard label="ALOS-2 positive area (district)" value={formatArea(stats.alos_positive_area_district_km2)} />
          <MetricCard label="ALOS-2 positive area (strict)" value={formatArea(stats.alos_positive_area_strict_km2)} />
        </div>

        <h3 className="mb-3 text-sm font-semibold text-white">Candidate transitions at -18 dB</h3>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Candidate gain" value={formatArea(stats.candidate_gain_m18_km2)} accent="text-red-300" />
          <MetricCard label="Candidate loss" value={formatArea(stats.candidate_loss_m18_km2)} accent="text-amber-300" />
          <MetricCard label="Net candidate change" value={formatSignedArea(stats.net_candidate_change_m18_km2)} />
        </div>

        <h3 className="mb-3 text-sm font-semibold text-white">Sensitivity comparison at -16 dB</h3>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Candidate gain" value={formatArea(stats.candidate_gain_m16_km2)} accent="text-red-300" />
          <MetricCard label="Candidate loss" value={formatArea(stats.candidate_loss_m16_km2)} accent="text-amber-300" />
          <MetricCard label="Net candidate change" value={formatSignedArea(stats.net_candidate_change_m16_km2)} />
        </div>

        <h3 className="mb-3 text-sm font-semibold text-white">ALOS-2 positive-detection overlap (strict domain)</h3>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="ALOS-2 overlap with GFM" value={formatPercent(stats.strict_gfm_positive_overlap_pct)} unit="" />
          <MetricCard label="ALOS-2 overlap with SAR -18 dB" value={formatPercent(stats.strict_sar_m18_positive_overlap_pct)} unit="" />
          <MetricCard label="ALOS-2 overlap with SAR -16 dB" value={formatPercent(stats.strict_sar_m16_positive_overlap_pct)} unit="" />
        </div>

        <div className="mb-6 rounded-lg border border-[#1e2d4a] bg-[#112240] p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">ALOS-2 detections outside the strict comparison area</h3>
          <p className="text-xs leading-relaxed text-slate-300">
            {formatArea(stats.alos_positive_area_outside_strict_km2)} km² of mapped ALOS-2 positive detections fall outside the strict comparison area, including {formatArea(stats.alos_positive_outside_due_to_reference_water_km2)} km² over historical/reference water and {formatArea(stats.alos_positive_outside_due_to_gfm_exclusion_km2)} km² in GFM-excluded areas. These areas are excluded from the strict comparison, not labelled as confirmed dry land.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Interpretation notice
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Candidate gains and losses are exploratory Sentinel-1 backscatter transitions, not confirmed flood extent. GFM and ALOS-2 are satellite-derived comparison sources; spatial overlap is not independent ground truth and does not by itself establish classification accuracy. No district-by-district breakdown is available in this Sylhet summary file.
          </p>
        </div>
      </div>
    );
  }

  // Do not feed a summary-only data object into the Feni-Noakhali panel.
  if (!Array.isArray(stats.districts)) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-[#0a192f] p-6 text-white">
        <div className="mb-2 flex items-center gap-2 font-semibold text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Statistics format not supported
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          This event's statistics do not contain the district-level fields required by the current panel. Check the selected event ID and its statistics branch in floodApi.js.
        </p>
      </div>
    );
  }

  const chartData = [
    {
      threshold: '−18 dB',
      gain: stats.candidate_gain_m18_km2,
      loss: stats.candidate_loss_m18_km2,
    },
    {
      threshold: '−16 dB',
      gain: stats.candidate_gain_m16_km2,
      loss: stats.candidate_loss_m16_km2,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#0a192f] p-6 shadow-xl">

      {/* Decorative gradient */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#06b6d4] opacity-5 blur-3xl" />

      {/* Data provenance */}
      <div className="mb-4 inline-flex items-center gap-2 rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold tracking-wider text-cyan-300">
        <Activity className="h-3.5 w-3.5" />
        EARTH ENGINE EXPORTS
      </div>

      <h2 className="text-3xl font-black text-white md:text-4xl">
        {formatSignedArea(stats.net_candidate_change_m18_km2)}
        <span className="ml-2 text-lg font-medium text-[#ef4444]">
          km²
        </span>
      </h2>

      <p className="mb-2 mt-2 text-sm font-medium text-slate-300">
        Net candidate water change (−18 dB)
      </p>

      <p className="mb-6 text-xs leading-relaxed text-slate-400">
        Observation dates: 9 August to 21 August 2024.
        Net change equals candidate gain minus candidate loss.
      </p>

      {/* Primary threshold */}
      <h3 className="mb-3 text-sm font-semibold text-white">
        Candidate transitions — −18 dB
      </h3>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <MetricCard
          label="Candidate gain"
          value={formatArea(stats.candidate_gain_m18_km2)}
          accent="text-[#f87171]"
        />

        <MetricCard
          label="Candidate loss"
          value={formatArea(stats.candidate_loss_m18_km2)}
          accent="text-[#fbbf24]"
        />

        <MetricCard
          label="OPERA open water"
          value={formatArea(stats.opera_open_water_km2)}
          accent="text-[#06b6d4]"
        />

        <MetricCard
          label="Valid comparison area"
          value={formatArea(stats.common_valid_area_km2)}
          accent="text-white"
        />
      </div>

      {/* Secondary threshold */}
      <h3 className="mb-3 text-sm font-semibold text-white">
        Sensitivity comparison — −16 dB
      </h3>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <MetricCard
          label="Candidate gain"
          value={formatArea(stats.candidate_gain_m16_km2)}
          accent="text-[#fb7185]"
        />

        <MetricCard
          label="Candidate loss"
          value={formatArea(stats.candidate_loss_m16_km2)}
          accent="text-[#fbbf24]"
        />

        <MetricCard
          label="Net candidate change"
          value={formatSignedArea(stats.net_candidate_change_m16_km2)}
          accent="text-white"
        />

        <MetricCard
          label="Pixel resolution"
          value={String(stats.pixel_size_m)}
          accent="text-white"
          unit="m"
        />
      </div>

      {/* Reference coverage */}
      <div className="mb-6 rounded-lg border border-[#1e2d4a] bg-[#112240] p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Data coverage
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">
              OPERA product coverage
            </span>

            <span className="font-semibold text-white">
              {formatPercent(stats.opera_product_coverage_percent)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">
              Common-valid coverage
            </span>

            <span className="font-semibold text-white">
              {formatPercent(stats.common_valid_coverage_percent)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">
              Original boundary area
            </span>

            <span className="font-semibold text-white">
              {formatArea(stats.original_boundary_area_km2)} km²
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">
              Rasterized area
            </span>

            <span className="font-semibold text-white">
              {formatArea(stats.rasterized_area_km2)} km²
            </span>
          </div>
        </div>
      </div>

      {/* Threshold chart */}
      <div className="mt-4 h-60">
        <h3 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <Activity className="h-4 w-4" />
          Candidate gain vs loss
        </h3>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
          >
            <XAxis
              dataKey="threshold"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />


<Tooltip
  formatter={(value, name, item) => {
    const dataKey = item?.dataKey;

    const label =
      dataKey === 'gain'
        ? 'Candidate gain'
        : dataKey === 'loss'
          ? 'Candidate loss'
          : String(name);

    return [
      `${formatArea(Number(value))} km²`,
      label,
    ];
  }}
  contentStyle={{
    backgroundColor: '#112240',
    border: '1px solid #1e2d4a',
    borderRadius: '8px',
    color: '#fff',
  }}
/>


            <Bar
              dataKey="gain"
              name="Candidate gain"
              fill="#f87171"
              radius={[4, 4, 0, 0]}
            />

            <Bar
              dataKey="loss"
              name="Candidate loss"
              fill="#fbbf24"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* District-by-district values: available for Feni-Noakhali only. */}
      {Array.isArray(stats.districts) && stats.districts.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-white">
            District breakdown
          </h3>

          <div className="space-y-3">
            {stats.districts.map((district) => (
              <div
                key={district.district}
                className="rounded-lg border border-[#1e2d4a] bg-[#112240] p-4"
              >
                <h4 className="mb-3 font-semibold text-white">
                  {district.district}
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">OPERA open water</span>
                    <span className="text-cyan-300">{formatArea(district.opera_open_water_km2)} km²</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Candidate gain (-18 dB)</span>
                    <span className="text-red-300">{formatArea(district.candidate_gain_m18_km2)} km²</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Candidate loss (-18 dB)</span>
                    <span className="text-amber-300">{formatArea(district.candidate_loss_m18_km2)} km²</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[#1e2d4a] pt-2">
                    <span className="text-slate-400">Net candidate change</span>
                    <span className="font-semibold text-white">{formatSignedArea(district.net_candidate_change_m18_km2)} km²</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scientific limitation */}
      <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Interpretation notice
        </div>

        <p className="text-xs leading-relaxed text-slate-300">
          Candidate gains and losses represent exploratory
          Sentinel-1 backscatter transitions. They are not
          confirmed flood extent. OPERA open water is a separate
          satellite-derived reference measurement, not independent
          ground truth. Coverage percentages describe data
          availability, not classification accuracy.
        </p>
      </div>

    </div>
  );
};

export default StatsPanel;
