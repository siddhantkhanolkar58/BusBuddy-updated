import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../lib/api.js';
import { TIME_BANDS } from '@sptos/shared';
import { useFetch } from '../../lib/useLive.js';
import { durationText, delayText, percent, plural, dateTime } from '../../lib/format.js';
import { ErrorNote, Loading, Section, Stat } from '../../components/ui.jsx';

const CHART_HEIGHT = 260;

const coverageTone = (share) =>
  share === null ? 'default' : share >= 0.9 ? 'good' : share >= 0.7 ? 'warn' : 'bad';
const maeTone = (seconds) =>
  seconds === null ? 'default' : seconds <= 180 ? 'good' : seconds <= 300 ? 'warn' : 'bad';

function ExportMenu({ params }) {
  const { data } = useFetch('/api/admin/exports');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const run = async (key) => {
    setBusy(key);
    setError(null);
    try {
      await api.download(`/api/admin/export/${key}`, params);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {data?.datasets?.map((dataset) => (
          <button
            key={dataset.key}
            type="button"
            className="btn-ghost py-2 px-3 text-xs font-bold rounded-xl"
            disabled={busy !== null}
            onClick={() => run(dataset.key)}
          >
            {busy === dataset.key ? 'Generating…' : `⤓ Download ${dataset.key}.csv`}
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
    </div>
  );
}

export function Dashboard() {
  const [routeId, setRouteId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  const params = {
    ...(routeId ? { routeId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const routes = useFetch('/api/admin/routes');
  const ops = useFetch('/api/admin/analytics/operations', { params });
  const demand = useFetch('/api/admin/analytics/demand', { params });
  const punctuality = useFetch('/api/admin/analytics/punctuality', { params });

  // Load security audit logs
  useEffect(() => {
    api
      .get('/api/admin/audit-logs')
      .then((data) => setAuditLogs(data.auditLogs || []))
      .catch(() => {});
  }, []);

  const summary = ops.data;

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-700">Transit Operations Hub</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Admin & Network Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time telemetry, crowd statistics, driver check-in coverage and security compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            System Healthy
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="filter-route">
            Route Filter
          </label>
          <select
            id="filter-route"
            className="field"
            value={routeId}
            onChange={(event) => setRouteId(event.target.value)}
          >
            <option value="">All active routes</option>
            {routes.data?.routes?.map((route) => (
              <option key={route.id} value={route.id}>
                {route.code} — {route.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-from">
            From Date
          </label>
          <input
            id="filter-from"
            type="date"
            className="field"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="filter-to">
            To Date
          </label>
          <input
            id="filter-to"
            type="date"
            className="field"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <ErrorNote error={ops.error} onRetry={ops.reload} />
      {ops.loading && !summary ? <Loading label="Calculating real-time analytics" /> : null}

      {/* ── 8 KPI CARDS ── */}
      {summary && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Key Network Indicators</h2>
            <span className="text-xs text-slate-400">Past 30 days aggregation</span>
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Stat
              label="Active Trips"
              value={summary.trips.active}
              tone={summary.trips.active > 0 ? 'good' : 'default'}
              hint="Currently live on road"
            />
            <Stat
              label="Completed Trips"
              value={summary.trips.completed}
              tone="good"
              hint="Trips safely concluded"
            />
            <Stat
              label="Active Routes"
              value={summary.adoption.activeRoutes}
              hint="Covered in network"
            />
            <Stat
              label="Stops Monitored"
              value={summary.adoption.stops}
              hint="Active physical stops"
            />
            <Stat
              label="Check-in Coverage"
              value={percent(summary.checkinCoverage.averageShare)}
              tone={coverageTone(summary.checkinCoverage.averageShare)}
              hint={`${plural(summary.checkinCoverage.tripsMeasured, 'trip')} measured`}
            />
            <Stat
              label="ETA Accuracy (MAE)"
              value={
                summary.etaAccuracy.maeSeconds === null
                  ? '—'
                  : durationText(summary.etaAccuracy.maeSeconds)
              }
              tone={maeTone(summary.etaAccuracy.maeSeconds)}
              hint={
                summary.etaAccuracy.resolvedPredictions === 0
                  ? 'Awaiting resolved trips'
                  : `Bias ${delayText(summary.etaAccuracy.biasSeconds)}`
              }
            />
            <Stat
              label="Active Drivers"
              value={`${summary.adoption.activeDrivers}/${summary.adoption.registeredDrivers}`}
              hint="Authorized crew"
            />
            <Stat
              label="Open Feedback Flags"
              value={summary.adoption.openIssues}
              tone={summary.adoption.openIssues ? 'warn' : 'good'}
              hint="Commuter reports"
            />
          </div>
        </section>
      )}

      {/* ── DEMAND BY TIME BAND CHART ── */}
      <Section
        title="Crowd Demand by Time Band"
        subtitle="Visualizing commuter boarding load factor and peak travel periods"
      >
        <ErrorNote error={demand.error} onRetry={demand.reload} />
        {demand.data?.byBand?.length === 0 ? (
          <p className="card-pad text-sm text-slate-500">No check-in telemetry recorded in this time range.</p>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={bandSeries(demand.data?.byBand)} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="bandLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                  formatter={(value, key) =>
                    key === 'crowded' ? [value, 'Standing / Full'] : [value, 'Total Check-ins']
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="checkins" name="Total Check-ins" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                <Bar dataKey="crowded" name="High Crowding" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ── BUSIEST STOPS TABLE ── */}
      <Section title="High-Demand Boarding Stops" subtitle="Stops reporting maximum passenger occupancy">
        {demand.data?.byStop?.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="table-plain w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Stop Name</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Time Band</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Day Type</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Check-ins</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Avg Load</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Crowding Rate</th>
                </tr>
              </thead>
              <tbody>
                {demand.data.byStop.slice(0, 10).map((row) => (
                  <tr key={`${row.stopId}-${row.band}-${row.dayType}`} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{row.stopName}</span>
                      <span className="ml-2 font-mono text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{row.stopCode}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{row.bandLabel}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs capitalize">{row.dayType}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{row.checkins}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold">{percent(row.avgLoadFactor)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        row.crowdedShare > 0.4 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {percent(row.crowdedShare)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      {/* ── PUNCTUALITY BY ROUTE ── */}
      <Section
        title="Punctuality & Schedule Reliability"
        subtitle="Comparing measured check-in offsets against the planned route timetable"
      >
        <ErrorNote error={punctuality.error} onRetry={punctuality.reload} />
        {punctuality.data?.byRoute?.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="table-plain w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Route</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Observations</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Median Delay</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Average Delay</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">Worst Delay</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-slate-500">On-Time %</th>
                </tr>
              </thead>
              <tbody>
                {punctuality.data.byRoute.map((row) => (
                  <tr key={row.routeId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-xs bg-brand-700 text-white px-2 py-0.5 rounded mr-2">{row.routeCode}</span>
                      <strong className="text-slate-900 text-sm">{row.routeName}</strong>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{row.samples}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{delayText(row.medianDelaySeconds)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{delayText(row.avgDelaySeconds)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-red-600 font-bold">{delayText(row.worstDelaySeconds)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                        {percent(row.onTimeShare)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      {/* ── SECURITY AUDIT TRAIL ── */}
      <Section
        title="Security & Governance Audit Trail"
        subtitle="Recent administrative security events, role updates and password reset audit entries"
      >
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto p-4">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No security audit logs recorded yet.</p>
          ) : (
            <table className="table-plain w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="py-2.5 px-3 text-xs font-bold text-slate-500">Time</th>
                  <th className="py-2.5 px-3 text-xs font-bold text-slate-500">Action</th>
                  <th className="py-2.5 px-3 text-xs font-bold text-slate-500">Initiated By</th>
                  <th className="py-2.5 px-3 text-xs font-bold text-slate-500">Target User</th>
                  <th className="py-2.5 px-3 text-xs font-bold text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="text-xs">
                    <td className="py-2 px-3 text-slate-400 font-mono">{dateTime(log.created_at)}</td>
                    <td className="py-2 px-3">
                      <span className="rounded bg-brand-100 text-brand-800 font-mono font-bold px-1.5 py-0.5">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{log.actor_name || `Admin #${log.actor_id}`}</td>
                    <td className="py-2 px-3 text-slate-700">{log.target_name || `User #${log.target_id}`}</td>
                    <td className="py-2 px-3 text-slate-500">{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>

      {/* ── EXPORT DATA ── */}
      <Section title="Export Telemetry Data" subtitle="Download verified CSV reports for city planning authorities">
        <ExportMenu params={params} />
      </Section>
    </div>
  );
}

function bandSeries(byBand = []) {
  const merged = new Map();
  for (const row of byBand) {
    const entry = merged.get(row.band) ?? {
      band: row.band,
      bandLabel: row.bandLabel,
      checkins: 0,
      crowded: 0,
    };
    entry.checkins += row.checkins;
    entry.crowded += row.crowdedCheckins;
    merged.set(row.band, entry);
  }
  return TIME_BANDS.map((band) => merged.get(band.key)).filter(Boolean);
}

export default Dashboard;
