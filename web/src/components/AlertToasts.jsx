/**
 * Arrival alerts as they land (PRD FR-C6, FR-S4) and fleet risk alerts for admins.
 *
 * The server pushes an alert to the signed-in commuter's private socket room or
 * to the admin room for fleet maintenance alerts.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SOCKET_EVENTS } from '@sptos/shared';
import { on } from '../lib/socket.js';
import { useAuth } from '../lib/auth.jsx';
import { rangeText } from '../lib/format.js';

const DISMISS_AFTER_MS = 40_000;

function systemNotify(alert) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification(`${alert.routeCode} arriving at ${alert.stopName}`, {
    body: `About ${alert.etaMinutes} min away (estimate, ${rangeText(alert)}).`,
    tag: `sptos-${alert.subscriptionId}-${alert.tripId}`,
    icon: '/icon-192.png',
  });
}

export function AlertToasts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [fleetAlerts, setFleetAlerts] = useState([]);

  const dismiss = useCallback((tripId, subscriptionId) => {
    setAlerts((current) =>
      current.filter((alert) => alert.tripId !== tripId || alert.subscriptionId !== subscriptionId),
    );
  }, []);

  const dismissFleet = useCallback((busId) => {
    setFleetAlerts((current) => current.filter((alert) => alert.busId !== busId));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    return on(SOCKET_EVENTS.ARRIVAL_ALERT, (alert) => {
      setAlerts((current) => [
        alert,
        ...current.filter(
          (existing) =>
            existing.subscriptionId !== alert.subscriptionId || existing.tripId !== alert.tripId,
        ),
      ]);
      systemNotify(alert);
      setTimeout(() => dismiss(alert.tripId, alert.subscriptionId), DISMISS_AFTER_MS);
    });
  }, [dismiss, user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return undefined;
    return on(SOCKET_EVENTS.FLEET_ALERT, (alert) => {
      setFleetAlerts((current) => [
        alert,
        ...current.filter((existing) => existing.busId !== alert.busId),
      ]);
      setTimeout(() => dismissFleet(alert.busId), DISMISS_AFTER_MS);
    });
  }, [dismissFleet, user]);

  if (alerts.length === 0 && fleetAlerts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[1000] flex flex-col items-center gap-2 px-3"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      role="region"
      aria-label="Alerts"
    >
      {fleetAlerts.map((alert) => (
        <div
          key={`fleet-${alert.busId}`}
          role="alert"
          className="card animate-toast-in pointer-events-auto w-full max-w-md border-red-300 bg-red-50 p-3 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-bad px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
              Fleet Alert
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-900">
                {alert.registrationNo || `Bus #${alert.busId}`}: High Risk ({Math.round((alert.score ?? 0) * 100)}%)
              </p>
              <p className="text-xs text-red-700">
                {alert.factors?.[0] || 'High predictive maintenance risk detected.'}
              </p>
              <Link
                to={`/admin/fleet/${alert.busId}`}
                className="mt-1 inline-block text-xs font-semibold text-red-800 underline"
                onClick={() => dismissFleet(alert.busId)}
              >
                Inspect fleet health
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss fleet alert"
              className="rounded-lg px-2 py-1 text-red-900/60 transition-colors hover:bg-red-100 hover:text-red-900 active:scale-90"
              onClick={() => dismissFleet(alert.busId)}
            >
              ✕
            </button>
          </div>
          <span
            aria-hidden="true"
            className="mt-2 block h-0.5 origin-left rounded-full bg-red-300"
            style={{ animation: `grow-x ${DISMISS_AFTER_MS}ms linear reverse forwards` }}
          />
        </div>
      ))}

      {alerts.map((alert) => (
        <div
          key={`${alert.subscriptionId}-${alert.tripId}`}
          role="alert"
          className="card animate-toast-in pointer-events-auto w-full max-w-md border-brand-200 bg-brand-50 p-3 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-brand-700 px-2 py-0.5 text-sm font-bold text-white">
              {alert.routeCode}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-900">
                Arriving at {alert.stopName} in about {alert.etaMinutes} min
              </p>
              <p className="text-xs text-brand-900/80">
                Estimated {rangeText(alert)} — not a timetabled time.
              </p>
              <Link
                to={`/stops/${alert.stopId}?routeId=${alert.routeId}`}
                className="mt-1 inline-block text-xs font-semibold text-brand-700 underline"
                onClick={() => dismiss(alert.tripId, alert.subscriptionId)}
              >
                Open the stop
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss alert"
              className="rounded-lg px-2 py-1 text-brand-900/60 transition-colors hover:bg-brand-100 hover:text-brand-900 active:scale-90"
              onClick={() => dismiss(alert.tripId, alert.subscriptionId)}
            >
              ✕
            </button>
          </div>

          <span
            aria-hidden="true"
            className="mt-2 block h-0.5 origin-left rounded-full bg-brand-300"
            style={{ animation: `grow-x ${DISMISS_AFTER_MS}ms linear reverse forwards` }}
          />
        </div>
      ))}
    </div>
  );
}

export default AlertToasts;
