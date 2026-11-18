/**
 * Fleet health API (Predictive Maintenance module).
 *
 * Admin endpoints: GET /api/admin/fleet, GET /api/admin/fleet/buses/:id,
 *   POST /api/admin/fleet/buses/:id/maintenance, PATCH /api/admin/faults/:id
 *
 * Driver endpoint: POST /api/driver/trips/:id/faults  (see driver.routes.js)
 *
 * All routes are Zod-validated; admin routes are guarded by authenticate +
 * requireRole('admin') inherited from admin.routes.js where this router is
 * mounted.
 */
import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/index.js';
import { notFoundError } from '../middleware/errors.js';
import {
  scoreAllBuses,
  rescoreBus,
  getBusRiskLevel,
  scorebus,
} from '../services/maintenance.service.js';

const router = Router();

const idSchema = z.coerce.number().int().positive();

// ---------------------------------------------------------------------------
// GET /api/admin/fleet — all buses with risk scores, sorted by risk descending
// ---------------------------------------------------------------------------
router.get('/fleet', async (_req, res) => {
  const buses = await scoreAllBuses();
  res.json({ buses });
});

// ---------------------------------------------------------------------------
// GET /api/admin/fleet/buses/:id — full detail for one bus
// ---------------------------------------------------------------------------
router.get('/fleet/buses/:id', async (req, res) => {
  const busId = idSchema.parse(req.params.id);

  const bus = await queryOne(
    'SELECT id, registration_no, model, manufacture_year, odometer_km FROM buses WHERE id = $1',
    [busId],
  );
  if (!bus) throw notFoundError('Bus');

  // Last 10 service events
  const { rows: logs } = await query(
    `SELECT id, serviced_at, odometer_km, kind, notes
       FROM maintenance_logs WHERE bus_id = $1 ORDER BY serviced_at DESC LIMIT 10`,
    [busId],
  );

  // Open faults
  const { rows: faults } = await query(
    `SELECT id, kind, severity, status, note, created_at
       FROM fault_reports WHERE bus_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [busId],
  );

  // Recent breakdowns
  const { rows: breakdowns } = await query(
    `SELECT id, occurred_at, note FROM breakdown_events
      WHERE bus_id = $1 ORDER BY occurred_at DESC LIMIT 20`,
    [busId],
  );

  // Compute score
  const now = new Date();
  const lastService = logs[0] ?? null;
  const ageYears = now.getFullYear() - Number(bus.manufacture_year) + (now.getMonth() / 12);
  const kmSinceService = lastService
    ? Math.max(0, Number(bus.odometer_km) - Number(lastService.odometer_km))
    : Number(bus.odometer_km);
  const daysSinceService = lastService
    ? (now - new Date(lastService.serviced_at)) / 86_400_000
    : 9999;
  const openFaults = faults.filter((f) => f.status === 'open').length;
  const cutoff60 = new Date(now - 60 * 86_400_000);
  const recentHighFaults = faults.filter(
    (f) => f.severity === 'high' && new Date(f.created_at) >= cutoff60,
  ).length;
  const cutoff180 = new Date(now - 180 * 86_400_000);
  const recentBreakdowns = breakdowns.filter(
    (b) => new Date(b.occurred_at) >= cutoff180,
  ).length;

  const scoring = scorebus({
    ageYears, kmSinceService, daysSinceService,
    openFaults, recentHighFaults, recentBreakdowns,
  });

  res.json({
    bus: {
      id: Number(bus.id),
      registrationNo: bus.registration_no,
      model: bus.model,
      manufactureYear: Number(bus.manufacture_year),
      odometerKm: Number(bus.odometer_km),
      ageYears: Math.round(ageYears * 10) / 10,
      kmSinceService: Math.round(kmSinceService),
      daysSinceService: Math.round(daysSinceService),
      openFaults,
      recentHighFaults,
      recentBreakdowns,
      ...scoring,
    },
    logs: logs.map((row) => ({
      id: Number(row.id),
      servicedAt: row.serviced_at,
      odometerKm: Number(row.odometer_km),
      kind: row.kind,
      notes: row.notes ?? null,
    })),
    faults: faults.map((row) => ({
      id: Number(row.id),
      kind: row.kind,
      severity: row.severity,
      status: row.status,
      note: row.note ?? null,
      createdAt: row.created_at,
    })),
    breakdowns: breakdowns.map((row) => ({
      id: Number(row.id),
      occurredAt: row.occurred_at,
      note: row.note ?? null,
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/fleet/buses/:id/maintenance — log a service event
// ---------------------------------------------------------------------------
const maintenanceBody = z.object({
  odometerKm: z.coerce.number().int().min(0),
  kind: z.enum(['routine', 'repair', 'inspection', 'overhaul']).default('routine'),
  notes: z.string().trim().max(500).optional(),
  servicedAt: z.coerce.date().optional(),
});

router.post('/fleet/buses/:id/maintenance', async (req, res) => {
  const busId = idSchema.parse(req.params.id);
  const input = maintenanceBody.parse(req.body);

  const bus = await queryOne('SELECT id, odometer_km FROM buses WHERE id = $1', [busId]);
  if (!bus) throw notFoundError('Bus');

  // Capture previous risk level before service log
  const previousLevel = await getBusRiskLevel(busId);

  // Also advance odometer if new reading is higher
  const newOdometer = Math.max(Number(bus.odometer_km), input.odometerKm);

  const log = await queryOne(
    `INSERT INTO maintenance_logs (bus_id, odometer_km, kind, notes, serviced_at)
     VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))
     RETURNING id, bus_id, odometer_km, kind, notes, serviced_at`,
    [busId, input.odometerKm, input.kind, input.notes ?? null,
      input.servicedAt ? new Date(input.servicedAt).toISOString() : null],
  );

  await query('UPDATE buses SET odometer_km = $2 WHERE id = $1', [busId, newOdometer]);

  // Rescore after service — risk should drop
  const { riskLevel, score, factors, predictedDaysToService } = await rescoreBus(busId, { previousLevel });

  res.status(201).json({
    log: {
      id: Number(log.id),
      busId: Number(log.bus_id),
      odometerKm: Number(log.odometer_km),
      kind: log.kind,
      notes: log.notes ?? null,
      servicedAt: log.serviced_at,
    },
    updatedScore: { riskLevel, score, factors, predictedDaysToService },
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/faults/:id — resolve a fault
// ---------------------------------------------------------------------------
router.patch('/faults/:id', async (req, res) => {
  const faultId = idSchema.parse(req.params.id);
  const { status } = z.object({ status: z.enum(['open', 'resolved']) }).parse(req.body);

  const existing = await queryOne(
    'SELECT id, bus_id, status FROM fault_reports WHERE id = $1',
    [faultId],
  );
  if (!existing) throw notFoundError('Fault report');

  const previousLevel = await getBusRiskLevel(Number(existing.bus_id));

  const updated = await queryOne(
    'UPDATE fault_reports SET status = $2 WHERE id = $1 RETURNING id, bus_id, status',
    [faultId, status],
  );

  // Rescore the bus after fault status changes
  await rescoreBus(Number(updated.bus_id), { previousLevel });

  res.json({ fault: { id: Number(updated.id), busId: Number(updated.bus_id), status: updated.status } });
});

export default router;
