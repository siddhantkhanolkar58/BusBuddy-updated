-- ---------------------------------------------------------------------------
-- Fleet maintenance and predictive health (SPTOS maintenance module).
--
-- Design notes
--   * All tables use CHECK constraints rather than CREATE TYPE for portability
--     and re-runnability (same pattern as 001_init.sql).
--   * bus_id on trips is nullable so the existing seed and test data remain
--     valid without any back-fill.
-- ---------------------------------------------------------------------------

-- Physical buses in the fleet.
CREATE TABLE IF NOT EXISTS buses (
  id               SERIAL PRIMARY KEY,
  registration_no  TEXT        NOT NULL UNIQUE,
  model            TEXT        NOT NULL,
  manufacture_year INTEGER     NOT NULL CHECK (manufacture_year BETWEEN 1990 AND 2100),
  odometer_km      INTEGER     NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service log: one row per service event on a bus.
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id          SERIAL PRIMARY KEY,
  bus_id      INTEGER     NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  serviced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  odometer_km INTEGER     NOT NULL CHECK (odometer_km >= 0),
  kind        TEXT        NOT NULL CHECK (kind IN ('routine', 'repair', 'inspection', 'overhaul')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fault reports raised by drivers during trips.
CREATE TABLE IF NOT EXISTS fault_reports (
  id         SERIAL PRIMARY KEY,
  bus_id     INTEGER     NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  trip_id    INTEGER              REFERENCES trips(id)  ON DELETE SET NULL,
  kind       TEXT        NOT NULL,
  severity   TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status     TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Breakdown events: bus stopped mid-route due to mechanical failure.
CREATE TABLE IF NOT EXISTS breakdown_events (
  id          SERIAL PRIMARY KEY,
  bus_id      INTEGER     NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  trip_id     INTEGER              REFERENCES trips(id)  ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional bus association on trips.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS bus_id INTEGER REFERENCES buses(id) ON DELETE SET NULL;

-- Indexes for fast fleet queries.
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_bus_at ON maintenance_logs (bus_id, serviced_at DESC);
CREATE INDEX IF NOT EXISTS idx_fault_reports_bus_status ON fault_reports (bus_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breakdown_events_bus_at  ON breakdown_events (bus_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_bus_id             ON trips (bus_id) WHERE bus_id IS NOT NULL;

