import type { Knex } from "knex";

const DEFAULT_SERVICE_TYPES = [
  { code: "OIL_CHANGE", name: "Oil change", category: "vehicle", interval_days: 90, interval_km: 5000, sort_order: 1 },
  { code: "TYRE_CHANGE", name: "Tyre change", category: "vehicle", interval_days: 730, interval_km: 40000, sort_order: 2 },
  { code: "SERVICE", name: "Service", category: "vehicle", interval_days: 180, interval_km: 10000, sort_order: 3 },
  { code: "REGISTRATION", name: "Registration", category: "vehicle", interval_days: 365, interval_km: null, sort_order: 4 },
  { code: "INSURANCE", name: "Insurance", category: "vehicle", interval_days: 365, interval_km: null, sort_order: 5 },
];

/** Default vehicle service types. Idempotent: codes that already exist are left alone. */
export async function seed(knex: Knex): Promise<void> {
  const taken = await knex("asset_service_types")
    .whereIn("code", DEFAULT_SERVICE_TYPES.map((t) => t.code))
    .pluck("code");
  const rows = DEFAULT_SERVICE_TYPES.filter((t) => !taken.includes(t.code)).map((t) => ({
    ...t,
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }));
  if (rows.length) await knex("asset_service_types").insert(rows);
}
