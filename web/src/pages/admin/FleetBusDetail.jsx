/**
 * Admin fleet bus detail (Predictive Maintenance module).
 *
 * Shows score, top contributing factors, fault list, maintenance log,
 * and a "Log service" form.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch } from '../../lib/useLive.js';
import api from '../../lib/api.js';
import { clockTime, dateTime } from '../../lib/format.js';
import {
  Crumb,
  ErrorNote,
  Loading,
  Section,
  Stat,
} from '../../components/ui.jsx';

const RISK_BADGE = {
  low: 'bg-good-soft text-good',
  medium: 'bg-warn-soft text-warn',
  high: 'bg-bad-soft text-bad font-bold',
};

const SEVERITY_BADGE = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-warn-soft text-warn',
  high: 'bg-bad-soft text-bad',
};

function RiskBadge({ level }) {
  return (
    <span className={`pill ${RISK_BADGE[level] ?? 'bg-mute-soft text-mute'}`}>
      {level} risk
    </span>
  );
}

function LogServiceForm({ busId, onSuccess }) {
  const [form, setForm] = useState({ odometerKm: '', kind: 'routine', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/admin/fleet/buses/${busId}/maintenance`, {
        odometerKm: Number(form.odometerKm),
        kind: form.kind,
        notes: form.notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-pad space-y-3">
      <p className="text-sm font-semibold text-slate-800">Log a service event</p>
      <ErrorNote error={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Odometer at service (km)
          </label>
          <input
            type="number"
            min="0"
            required
            className="input-field w-full"
            value={form.odometerKm}
            onChange={(e) => setForm((f) => ({ ...f, odometerKm: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Service kind
          </label>
          <select
            className="input-field w-full"
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
          >
            <option value="routine">Routine</option>
            <option value="repair">Repair</option>
            <option value="inspection">Inspection</option>
            <option value="overhaul">Overhaul</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Notes (optional)
        </label>
        <textarea
          className="input-field w-full"
          rows={2}
          maxLength={500}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Log service'}
      </button>
    </form>
  );
}

export function FleetBusDetail() {
  const { busId } = useParams();
  const { data, error, loading, reload } = useFetch(`/api/admin/fleet/buses/${busId}`);
  const [resolveBusy, setResolveBusy] = useState(null);
  const [resolveError, setResolveError] = useState(null);

  const resolveFault = async (faultId) => {
    setResolveBusy(faultId);
    setResolveError(null);
    try {
      await api.patch(`/api/admin/faults/${faultId}`, { status: 'resolved' });
      await reload();
    } catch (err) {
      setResolveError(err);
    } finally {
      setResolveBusy(null);
    }
  };

  if (loading && !data) return <Loading label="Loading bus detail" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data?.bus) return <ErrorNote error={{ message: 'Bus not found.' }} />;

  const { bus, logs, faults, breakdowns } = data;
  const riskTone = bus.riskLevel === 'high' ? 'bad' : bus.riskLevel === 'medium' ? 'warn' : 'good';

  return (
    <div className="space-y-6">
      <Crumb to="/admin/fleet">Fleet health</Crumb>

      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 font-mono">{bus.registrationNo}</h1>
          <RiskBadge level={bus.riskLevel} />
        </div>
        <p className="text-sm text-slate-500">{bus.model} · {bus.manufactureYear}</p>
      </header>

      {/* Score stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Risk score"
          value={`${Math.round(bus.score * 100)}%`}
          hint={`${bus.riskLevel} risk`}
          tone={riskTone}
        />
        <Stat
          label="Est. days to service"
          value={bus.predictedDaysToService <= 0 ? 'Overdue' : `${bus.predictedDaysToService} d`}
          tone={bus.predictedDaysToService <= 0 ? 'bad' : bus.predictedDaysToService < 14 ? 'warn' : 'good'}
        />
        <Stat
          label="Open faults"
          value={bus.openFaults}
          tone={bus.openFaults > 3 ? 'bad' : bus.openFaults > 0 ? 'warn' : 'good'}
        />
      </div>

      {/* Top contributing factors */}
      {bus.factors?.length > 0 && (
        <Section title="Top risk factors">
          <ol className="card divide-y divide-slate-100">
            {bus.factors.map((factor, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700">{factor}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Log service form */}
      <Section title="Log service">
        <LogServiceForm busId={busId} onSuccess={reload} />
      </Section>

      {/* Fault reports */}
      <Section title="Fault reports" subtitle="Recent fault reports on this bus">
        <ErrorNote error={resolveError} />
        {faults.length === 0 ? (
          <p className="text-sm text-slate-500">No fault reports yet.</p>
        ) : (
          <ol className="card divide-y divide-slate-100">
            {faults.map((fault) => (
              <li key={fault.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{fault.kind}</span>
                    <span className={`pill ${SEVERITY_BADGE[fault.severity]}`}>
                      {fault.severity}
                    </span>
                    <span className={`pill ${fault.status === 'open' ? 'bg-warn-soft text-warn' : 'bg-mute-soft text-mute'}`}>
                      {fault.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{dateTime(fault.createdAt)}</p>
                  {fault.note ? <p className="text-xs text-slate-600 mt-1">{fault.note}</p> : null}
                </div>
                {fault.status === 'open' ? (
                  <button
                    type="button"
                    className="btn-ghost py-1 text-xs"
                    disabled={resolveBusy === fault.id}
                    onClick={() => resolveFault(fault.id)}
                  >
                    {resolveBusy === fault.id ? 'Resolving…' : 'Resolve'}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Maintenance log */}
      <Section title="Maintenance log">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">No service events recorded.</p>
        ) : (
          <ol className="card divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill bg-brand-50 text-brand-800">{log.kind}</span>
                  <span className="text-sm font-medium text-slate-800">
                    {Number(log.odometerKm).toLocaleString()} km
                  </span>
                  <span className="text-xs text-slate-500">{dateTime(log.servicedAt)}</span>
                </div>
                {log.notes ? <p className="text-xs text-slate-600 mt-1">{log.notes}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Breakdowns */}
      {breakdowns.length > 0 && (
        <Section title="Recent breakdowns">
          <ol className="card divide-y divide-slate-100">
            {breakdowns.map((bd) => (
              <li key={bd.id} className="px-4 py-3 text-sm text-slate-700">
                {dateTime(bd.occurredAt)}
                {bd.note ? ` — ${bd.note}` : ''}
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

export default FleetBusDetail;

