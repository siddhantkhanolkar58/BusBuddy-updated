/**
 * Predictive maintenance scoring (Fleet health module).
 *
 * NOTE: All bus data, maintenance logs, fault reports and breakdowns in the
 * seed database are SIMULATED for demonstration purposes. They are generated
 * deterministically so that the dashboard always shows the same pattern, making
 * the risk model easy to reason about.
 *
 * Risk model
 * ----------
 * The score is a weighted logistic transform of six normalised inputs. No
 * training data is required: the weights encode operational rules of thumb.
 *
 *   w1 = 0.20  bus age (years above a 5-year baseline)
 *   w2 = 0.25  km since last service (above 5 000 km interval)
 *   w3 = 0.20  days since last service (above 90-day interval)
 *   w4 = 0.15  open fault count
 *   w5 = 0.10  high-severity faults in last 60 days
 *   w6 = 0.10  breakdown events in last 180 days
 *
 * logistic(x) = 1 / (1 + exp(-x))
 * raw         = sum(wi * xi)          xi is the normalised, unbounded input
 * score       = logistic(raw - 1)     shift so a brand-new bus near 0
 */
import { query } from '../db/index.js';
import { emitFleetAlert } from './realtime.js';

// ---------------------------------------------------------------------------
// Pure scoring function (no DB calls — easy to unit-test)
// ---------------------------------------------------------------------------

const SERVICE_KM_INTERVAL = 5_000;   // km between routine services
const SERVICE_DAY_INTERVAL = 90;     // days between services
const BASE_AGE_YEARS = 5;            // below this, age adds no risk

/** Logistic sigmoid. */
function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Scores a single bus from its maintenance snapshot.
 *
 * @param {object} snapshot
 *   ageYears          - bus age in fractional years
 *   kmSinceService    - odometer km accumulated since the last service
 *   daysSinceService  - calendar days since the last service (Infinity if never)
 *   openFaults        - count of open fault reports
 *   recentHighFaults  - high-severity faults in the last 60 days
 *   recentBreakdowns  - breakdown events in the last 180 days
 *
 * @returns {{ score, riskLevel, predictedDaysToService, factors }}
 */
export function scorebus(snapshot) {
  const {
    ageYears = 0,
    kmSinceService = 0,
    daysSinceService = 0,
    openFaults = 0,
    recentHighFaults = 0,
    recentBreakdowns = 0,
  } = snapshot;

  // Normalise each input to a dimensionless, unbounded value.
  const x1 = Math.max(0, ageYears - BASE_AGE_YEARS) / 5;           // 10yr old bus → 1.0
  const x2 = kmSinceService / SERVICE_KM_INTERVAL;                  // at interval → 1.0
  const x3 = Math.min(daysSinceService, 365) / SERVICE_DAY_INTERVAL;// at interval → 1.0
  const x4 = Math.min(openFaults, 10) / 3;                          // 3 open faults → 1.0
  const x5 = Math.min(recentHighFaults, 5) / 2;                     // 2 high-sev → 1.0
  const x6 = Math.min(recentBreakdowns, 5) / 1;                     // 1 breakdown → 1.0

  const raw = 0.20 * x1 + 0.25 * x2 + 0.20 * x3 + 0.15 * x4 + 0.10 * x5 + 0.10 * x6;
  // Shift so an average new bus scores ~0.12 (low); subtract 1 centres midrange.
  const score = Math.min(1, Math.max(0, logistic(raw * 4 - 2)));

  const riskLevel = score >= 0.65 ? 'high' : score >= 0.35 ? 'medium' : 'low';

  // Estimate days until the next service is due based on the binding constraint.
  const kmRemaining = Math.max(0, SERVICE_KM_INTERVAL - kmSinceService);
  const daysRemaining = Math.max(0, SERVICE_DAY_INTERVAL - daysSinceService);
  // Assume 200 km/day average; pick whichever limit is nearest.
  const predictedDaysToService = Math.round(
    Math.min(kmRemaining / 200, daysRemaining),
  );

  // Top 3 contributing factors as human-readable sentences.
  const candidates = [
    { weight: 0.20 * x1, text: `Bus is ${Math.round(ageYears)} years old (baseline ${BASE_AGE_YEARS} yr)` },
    { weight: 0.25 * x2, text: `${Math.round(kmSinceService).toLocaleString()} km past service interval` },
    { weight: 0.20 * x3, text: `${Math.round(daysSinceService)} days since last service` },
    { weight: 0.15 * x4, text: `${openFaults} open fault${openFaults === 1 ? '' : 's'} on record` },
    { weight: 0.10 * x5, text: `${recentHighFaults} high-severity fault${recentHighFaults === 1 ? '' : 's'} in last 60 days` },
    { weight: 0.10 * x6, text: `${recentBreakdowns} breakdown event${recentBreakdowns === 1 ? '' : 's'} in last 180 days` },
  ]
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => c.text);

  return { score: Math.round(score * 1000) / 1000, riskLevel, predictedDaysToService, factors: candidates };
}

// ---------------------------------------------------------------------------
// DB loader: read raw data and score every bus
// ---------------------------------------------------------------------------

/** Reads maintenance data for one bus and returns its scoring snapshot. */
export async function busSnapshot(busId) {
  const now = new Date();

  // Last service
  const lastService = (await query(
    `SELECT serviced_at, odometer_km FROM maintenance_logs
      WHERE bus_id = $1 ORDER BY serviced_at DESC LIMIT 1`,
    [busId],
  )).rows[0] ?? null;

  // Bus current state
  const bus = (await query('SELECT odometer_km, manufacture_year FROM buses WHERE id = $1', [busId])).rows[0];
  const ageYears = now.getFullYear() - Number(bus.manufacture_year) + (now.getMonth() / 12);

  const kmSinceService = lastService
    ? Math.max(0, Number(bus.odometer_km) - Number(lastService.odometer_km))
    : Number(bus.odometer_km);

  const daysSinceService = lastService
    ? (now - new Date(lastService.serviced_at)) / 86_400_000
    : 9999; // never serviced

  // Open faults
  const { rows: faultRows } = await query(
    `SELECT severity FROM fault_reports WHERE bus_id = $1 AND status = 'open'`,
    [busId],
  );
  const openFaults = faultRows.length;

  // High-severity faults in the last 60 days
  const { rows: highRows } = await query(
    `SELECT id FROM fault_reports
      WHERE bus_id = $1 AND severity = 'high'
        AND created_at >= now() - INTERVAL '60 days'`,
    [busId],
  );
  const recentHighFaults = highRows.length;

  // Breakdowns in last 180 days
  const { rows: bdRows } = await query(
    `SELECT id FROM breakdown_events
      WHERE bus_id = $1 AND occurred_at >= now() - INTERVAL '180 days'`,
    [busId],
  );
  const recentBreakdowns = bdRows.length;

  return { ageYears, kmSinceService, daysSinceService, openFaults, recentHighFaults, recentBreakdowns };
}

/** Returns the current risk level of a bus. */
export async function getBusRiskLevel(busId) {
  const snapshot = await busSnapshot(busId);
  const scoring = scorebus(snapshot);
  return scoring.riskLevel;
}

/** Loads and scores all buses. Returns an array sorted by risk score descending. */
export async function scoreAllBuses() {
  const { rows: buses } = await query(
    `SELECT id, registration_no, model, manufacture_year, odometer_km FROM buses ORDER BY id`,
  );

  const results = [];
  for (const bus of buses) {
    const snapshot = await busSnapshot(Number(bus.id));
    const scoring = scorebus(snapshot);
    results.push({
      id: Number(bus.id),
      registrationNo: bus.registration_no,
      model: bus.model,
      manufactureYear: Number(bus.manufacture_year),
      odometerKm: Number(bus.odometer_km),
      ...snapshot,
      ...scoring,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/** Scores one bus and emits FLEET_ALERT to the admin room only when risk changes to "high". */
export async function rescoreBus(busId, { previousLevel = null } = {}) {
  const snapshot = await busSnapshot(busId);
  const scoring = scorebus(snapshot);

  if (scoring.riskLevel === 'high' && previousLevel !== 'high') {
    const { rows: [bus] } = await query(
      'SELECT registration_no, model FROM buses WHERE id = $1', [busId],
    );
    emitFleetAlert({
      busId,
      registrationNo: bus?.registration_no,
      model: bus?.model,
      riskLevel: scoring.riskLevel,
      score: scoring.score,
      factors: scoring.factors,
      at: new Date().toISOString(),
    });
  }

  return scoring;
}
