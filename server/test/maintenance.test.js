import './env.js';
/**
 * Tests for the fleet predictive-maintenance module.
 *
 * 1. Unit tests on the pure scoring function (no DB required).
 * 2. RBAC check: non-admin gets 403 on fleet endpoints.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closeDb, queryOne } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { hashPassword } from '../src/middleware/auth.js';
import { scorebus } from '../src/services/maintenance.service.js';

const app = createApp();
const PASSWORD = 'test-password-fleet';
const ctx = {};
const auth = (token) => ({ authorization: `Bearer ${token}` });

before(async () => {
  await migrate({ log: false });

  // Seed a minimal admin and a commuter for RBAC tests.
  const adminRow = await queryOne(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin') RETURNING id`,
    ['Fleet Admin', 'fleet-admin@test.local', await hashPassword(PASSWORD)],
  );
  ctx.adminId = Number(adminRow.id);

  const commuterRow = await queryOne(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'commuter') RETURNING id`,
    ['Fleet Commuter', 'fleet-commuter@test.local', await hashPassword(PASSWORD)],
  );
  ctx.commuterId = Number(commuterRow.id);

  const adminSignin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'fleet-admin@test.local', password: PASSWORD });
  ctx.adminToken = adminSignin.body.token;

  const commuterSignin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'fleet-commuter@test.local', password: PASSWORD });
  ctx.commuterToken = commuterSignin.body.token;
});

after(async () => {
  await closeDb();
});

/* ── Pure scoring function unit tests ─────────────────────────────────────── */

test('risk rises with km since service', () => {
  const low = scorebus({ ageYears: 2, kmSinceService: 500, daysSinceService: 10,
    openFaults: 0, recentHighFaults: 0, recentBreakdowns: 0 });
  const high = scorebus({ ageYears: 2, kmSinceService: 12_000, daysSinceService: 10,
    openFaults: 0, recentHighFaults: 0, recentBreakdowns: 0 });
  assert.ok(high.score > low.score, `score should rise with km: ${low.score} -> ${high.score}`);
});

test('risk rises with open faults', () => {
  const noFaults = scorebus({ ageYears: 3, kmSinceService: 2000, daysSinceService: 30,
    openFaults: 0, recentHighFaults: 0, recentBreakdowns: 0 });
  const manyFaults = scorebus({ ageYears: 3, kmSinceService: 2000, daysSinceService: 30,
    openFaults: 8, recentHighFaults: 3, recentBreakdowns: 0 });
  assert.ok(manyFaults.score > noFaults.score,
    `score should rise with faults: ${noFaults.score} -> ${manyFaults.score}`);
});

test('a bus with no history does not crash and returns a valid score', () => {
  const result = scorebus({
    ageYears: 0,
    kmSinceService: 0,
    daysSinceService: 0,
    openFaults: 0,
    recentHighFaults: 0,
    recentBreakdowns: 0,
  });
  assert.ok(Number.isFinite(result.score), 'score must be a finite number');
  assert.ok(result.score >= 0 && result.score <= 1, 'score must be between 0 and 1');
  assert.ok(['low', 'medium', 'high'].includes(result.riskLevel), 'riskLevel must be valid');
  assert.ok(Array.isArray(result.factors), 'factors must be an array');
  assert.ok(Number.isFinite(result.predictedDaysToService), 'predictedDaysToService must be finite');
});

test('riskLevel thresholds: low < 0.35, medium 0.35-0.65, high >= 0.65', () => {
  // Low-risk bus
  const lowBus = scorebus({ ageYears: 1, kmSinceService: 100, daysSinceService: 5,
    openFaults: 0, recentHighFaults: 0, recentBreakdowns: 0 });
  assert.equal(lowBus.riskLevel, 'low', `expected low, got ${lowBus.riskLevel} (score ${lowBus.score})`);

  // High-risk bus: old, overdue, lots of faults
  const highBus = scorebus({ ageYears: 12, kmSinceService: 15_000, daysSinceService: 200,
    openFaults: 8, recentHighFaults: 4, recentBreakdowns: 3 });
  assert.equal(highBus.riskLevel, 'high', `expected high, got ${highBus.riskLevel} (score ${highBus.score})`);
});

test('top factors include the worst contributors', () => {
  const result = scorebus({ ageYears: 2, kmSinceService: 14_000, daysSinceService: 20,
    openFaults: 0, recentHighFaults: 0, recentBreakdowns: 0 });
  // km since service should be the dominant factor
  assert.ok(result.factors.length > 0, 'should have at least one factor');
  assert.ok(result.factors[0].includes('km'), `first factor should mention km: ${result.factors[0]}`);
});

/* ── RBAC: non-admin cannot access fleet endpoints ────────────────────────── */

test('non-admin (commuter) gets 403 on GET /api/admin/fleet', async () => {
  const res = await request(app)
    .get('/api/admin/fleet')
    .set(auth(ctx.commuterToken));
  assert.equal(res.status, 403, `expected 403, got ${res.status}: ${res.text}`);
});

test('unauthenticated request gets 401 on GET /api/admin/fleet', async () => {
  const res = await request(app).get('/api/admin/fleet');
  assert.equal(res.status, 401, `expected 401, got ${res.status}`);
});

test('admin can access GET /api/admin/fleet and gets a buses array', async () => {
  const res = await request(app)
    .get('/api/admin/fleet')
    .set(auth(ctx.adminToken));
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${res.text}`);
  assert.ok(Array.isArray(res.body.buses), 'response should have a buses array');
});

