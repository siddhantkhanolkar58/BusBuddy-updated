/**
 * Admin fleet health table (Predictive Maintenance module).
 *
 * Sorted by risk score descending so the buses most in need of attention are
 * always at the top. Colour badges follow the same low/medium/high palette used
 * throughout the app (good/warn/bad).
 */
import { Link } from 'react-router-dom';
import { useFetch } from '../../lib/useLive.js';
import { ErrorNote, Loading, Section } from '../../components/ui.jsx';

const RISK_BADGE = {
  low: 'bg-good-soft text-good',
  medium: 'bg-warn-soft text-warn',
  high: 'bg-bad-soft text-bad font-bold',
};

function RiskBadge({ level }) {
  return (
    <span className={`pill ${RISK_BADGE[level] ?? 'bg-mute-soft text-mute'}`}>
      {level}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = score >= 0.65 ? 'bg-bad' : score >= 0.35 ? 'bg-warn' : 'bg-good';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
}

export function FleetHealth() {
  const { data, error, loading, reload } = useFetch('/api/admin/fleet');

  if (loading && !data) return <Loading label="Loading fleet" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const buses = data?.buses ?? [];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Fleet health</h1>
        <p className="text-sm text-slate-500">
          Risk scores are computed from bus age, km and days since last service,
          open faults, and recent breakdowns. Higher score = more urgent attention.
        </p>
      </header>

      <Section>
        {buses.length === 0 ? (
          <p className="text-sm text-slate-500">No buses in the fleet yet.</p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Bus</th>
                    <th className="px-4 py-2.5">Model</th>
                    <th className="px-4 py-2.5">Year</th>
                    <th className="px-4 py-2.5">Risk</th>
                    <th className="px-4 py-2.5 min-w-[120px]">Score</th>
                    <th className="px-4 py-2.5">Est. days to service</th>
                    <th className="px-4 py-2.5">Open faults</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {buses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                        {bus.registrationNo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{bus.model}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{bus.manufactureYear}</td>
                      <td className="px-4 py-3">
                        <RiskBadge level={bus.riskLevel} />
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={bus.score} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">
                        {bus.predictedDaysToService <= 0
                          ? <span className="text-bad font-semibold">Overdue</span>
                          : `${bus.predictedDaysToService} d`}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className={bus.openFaults > 0 ? 'text-warn font-semibold' : 'text-slate-500'}>
                          {bus.openFaults}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/fleet/${bus.id}`}
                          className="link text-xs"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

export default FleetHealth;

