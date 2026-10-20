/**
 * Wipe the LOCAL database and refill it with ~20 consistent sample rows per table.
 *
 * Usage:
 *   npm run db:reset-local -- --yes
 *
 * Steps: run pending migrations → truncate every table (except knex_migrations*)
 * → roles/permissions seed → sample data. Refuses to run unless APP_ENV is
 * local and DB_HOST is localhost, so it can never touch dev/qa.
 *
 * Logins afterwards:
 *   admin    admin@example.com      / Admin@12345     (all admins share this password)
 *   employee john.doe@example.com   / Employee@12345  (all employees share this password)
 *
 * Fixed-size tables are not padded to 20: roles, permissions, role_permissions,
 * document_sequences (counters), invoice_branding (one settings row) and
 * refresh_tokens (sessions).
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import bcrypt from "bcrypt";
import knex, { type Knex } from "knex";
import knexConfig from "../knexfile";
import { db as appDb } from "../src/database/knex";
import { assetMaintenanceService, type ExpenseForVehicle } from "../src/modules/asset-maintenance/asset-maintenance.service";
import { syncExpenseReimbursements } from "../src/modules/payables/expense-bill.helper";
import { DocumentSequences, nextDocumentNumber } from "../src/shared/utils/document-number.util";
import {
  addDaysIso,
  calculateTotals,
  deriveSettlementStatus,
  filsToDecimalString,
  todayIso,
  type SettlementStatus,
} from "../src/shared/utils/money.util";

const N = 20;
const KEEP_TABLES = new Set(["knex_migrations", "knex_migrations_lock"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const today = todayIso();
const daysAgo = (days: number) => addDaysIso(today, -days);
const pick = <T>(list: readonly T[], i: number): T => list[i % list.length] as T;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ── Sample values ────────────────────────────────────────────────────────────

const PEOPLE = [
  "John Doe", "Jane Smith", "Ahmed Hassan", "Fatima Al Zahra", "Ravi Kumar", "Maria Santos", "Omar Khalid",
  "Aisha Rahman", "David Miller", "Priya Nair", "Yusuf Ibrahim", "Sara Al Mansoori", "Arjun Menon", "Layla Haddad",
  "Michael Brown", "Noor Hussain", "Karthik Raj", "Elena Petrova", "Hamad Al Ketbi", "Grace Thomas",
];
const ADMIN_NAMES = [
  "Super Admin", "Kathiravan N", "Rashid Al Nuaimi", "Deepa Iyer", "Tom Wilson", "Mona Saleh", "Vikram Shah",
  "Hessa Al Suwaidi", "Paul Fernandes", "Reem Abbas", "Sanjay Pillai", "Lina Farouk", "George Mathew",
  "Mariam Obaid", "Anil Varghese", "Zainab Qureshi", "Chris Evans", "Dana Khoury", "Suresh Babu", "Amal Jaber",
];
const COMPANIES = ["Acme Corporation", "Global Tech LLC", "Desert Logistics", "DX Record FZ-LLC"];
const CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Al Ain"];
const STREETS = ["Sheikh Zayed Road", "Al Wasl Road", "Jumeirah Beach Road", "Al Khail Road", "Corniche Road", "King Faisal Street"];

const CATEGORIES = [
  "Travel", "Meals & Entertainment", "Office Supplies", "Fuel", "Vehicle Maintenance", "Telecom", "Software",
  "Hardware", "Training", "Marketing", "Utilities", "Rent", "Insurance", "Professional Fees", "Courier",
  "Printing", "Medical", "Visa & Immigration", "Accommodation", "Miscellaneous",
];
/** Claims in these categories ask for the vehicle and its km. */
const VEHICLE_CATEGORIES = new Set(["Fuel", "Vehicle Maintenance"]);
/** [sub category, parent category, service type created on approval]. */
const SUB_CATEGORIES: Array<[string, string, string | null]> = [
  ["Air Tickets", "Travel", null], ["Taxi", "Travel", null],
  ["Client Lunch", "Meals & Entertainment", null], ["Team Dinner", "Meals & Entertainment", null],
  ["Stationery", "Office Supplies", null],
  ["Petrol", "Fuel", null], ["Diesel", "Fuel", null],
  ["Oil Change", "Vehicle Maintenance", "OIL_CHANGE"], ["Tyres", "Vehicle Maintenance", "TYRE_CHANGE"],
  ["General Service", "Vehicle Maintenance", "SERVICE"], ["Car Wash", "Vehicle Maintenance", "CAR_WASH"],
  ["Mobile Bills", "Telecom", null], ["Internet", "Telecom", null],
  ["SaaS Subscriptions", "Software", null],
  ["Laptops", "Hardware", null], ["Accessories", "Hardware", null],
  ["Online Courses", "Training", null], ["Social Media Ads", "Marketing", null],
  ["Electricity", "Utilities", null], ["Legal", "Professional Fees", null],
];
/** [sub sub category, parent sub category]. */
const SUB_SUB_CATEGORIES: Array<[string, string]> = [
  ["Economy", "Air Tickets"], ["Business", "Air Tickets"], ["Uber", "Taxi"], ["Careem", "Taxi"],
  ["Business Lunch", "Client Lunch"], ["A4 Paper", "Stationery"], ["Pens", "Stationery"],
  ["Super 98", "Petrol"], ["Special 95", "Petrol"], ["Synthetic Oil", "Oil Change"], ["Mineral Oil", "Oil Change"],
  ["Front Pair", "Tyres"], ["Full Set", "Tyres"], ["Postpaid", "Mobile Bills"], ["Fibre", "Internet"],
  ["Microsoft 365", "SaaS Subscriptions"], ["Adobe", "SaaS Subscriptions"], ["MacBook", "Laptops"],
  ["Monitors", "Accessories"], ["Udemy", "Online Courses"],
];
const PAYMENT_METHODS = [
  ["Cash", "CASH"], ["Bank Transfer", "BANK_TRANSFER"], ["Credit Card", "CREDIT_CARD"], ["Debit Card", "DEBIT_CARD"],
  ["Cheque", "CHEQUE"], ["Company Card", "COMPANY_CARD"], ["Petty Cash", "PETTY_CASH"], ["Apple Pay", "APPLE_PAY"],
  ["Google Pay", "GOOGLE_PAY"], ["Samsung Pay", "SAMSUNG_PAY"], ["PayPal", "PAYPAL"], ["Wire Transfer", "WIRE_TRANSFER"],
  ["Direct Debit", "DIRECT_DEBIT"], ["Salary Advance", "SALARY_ADVANCE"], ["Fuel Card", "FUEL_CARD"],
  ["Corporate Amex", "CORPORATE_AMEX"], ["Visa Corporate", "VISA_CORPORATE"], ["Mastercard Business", "MASTERCARD_BUSINESS"],
  ["Online Banking", "ONLINE_BANKING"], ["Mobile Wallet", "MOBILE_WALLET"],
] as const;
const SUPPLIERS = [
  "Al Futtaim Office Supplies", "Emirates Fleet Services", "Gulf Telecom Solutions", "Desert Print & Courier",
  "Blue Coast Facility Management", "Falcon IT Hardware", "ENOC Fuel Services", "Al Tayer Motors Service Centre",
  "Etisalat Business", "du Business", "Dubai Electricity & Water", "Oasis Water Supply", "Sharaf DG Corporate",
  "Jumbo Electronics B2B", "Aramex Express", "Orient Insurance", "AXA Gulf", "Bridgestone Tyre Centre",
  "Microsoft Gulf", "Zoho Middle East",
];
const CUSTOMERS = [
  "Al Noor Trading LLC", "Gulf Star Logistics", "Emirates Fresh Foods", "Desert Rose Interiors", "Blue Wave Marine",
  "Falcon Tech FZ-LLC", "Palm Hospitality Group", "Marina Real Estate", "Oasis Medical Centre", "Crescent Builders",
  "Sahara Events", "Pearl Jewellers", "Sky High Aviation", "Golden Sands Hotel", "Al Reem Contracting",
  "Majestic Retail", "Horizon Education", "Nakheel Facility Co", "Arabian Auto Parts", "Coral Bay Resorts",
];
const BILL_LINES = [
  "Printer paper and toner", "Fleet servicing – monthly", "Business internet & PBX", "Courier and printing",
  "Office cleaning – monthly", "Laptops and accessories", "Air-conditioning maintenance", "Mobile plans – corporate",
];
const INVOICE_LINES = [
  "Consulting services", "Freight forwarding services", "Fit-out project – stage payment", "Monthly retainer",
  "Logistics support – container clearance", "Software implementation", "Marine equipment supply", "Training workshop",
];

/** Vehicle registrations double as their asset numbers. */
const VEHICLES = [
  { assetNo: "DXB-A-12345", name: "Toyota Hiace", brand: "Toyota", model: "Hiace 2023", cost: 115000, baseKm: 18000, kmPerDay: 140 },
  { assetNo: "DXB-B-48211", name: "Nissan Sunny", brand: "Nissan", model: "Sunny 2022", cost: 62000, baseKm: 41000, kmPerDay: 90 },
  { assetNo: "AUH-5-90876", name: "Toyota Hilux", brand: "Toyota", model: "Hilux 2024", cost: 128000, baseKm: 6000, kmPerDay: 120 },
  { assetNo: "SHJ-3-33410", name: "Mitsubishi Canter", brand: "Mitsubishi", model: "Canter 2021", cost: 98000, baseKm: 76000, kmPerDay: 160 },
  { assetNo: "DXB-K-70555", name: "Hyundai Elantra", brand: "Hyundai", model: "Elantra 2023", cost: 74000, baseKm: 22000, kmPerDay: 70 },
  { assetNo: "DXB-L-11902", name: "Kia Pegas", brand: "Kia", model: "Pegas 2024", cost: 48000, baseKm: 3000, kmPerDay: 85 },
  { assetNo: "AJM-C-26478", name: "Ford Transit", brand: "Ford", model: "Transit 2022", cost: 121000, baseKm: 54000, kmPerDay: 150 },
  { assetNo: "DXB-M-80314", name: "Toyota Corolla", brand: "Toyota", model: "Corolla 2023", cost: 79000, baseKm: 29000, kmPerDay: 95 },
];
/** Odometer as a function of date keeps every reading consistent (never goes down). */
function kmOn(vehicleIndex: number, date: string): number {
  const v = VEHICLES[vehicleIndex]!;
  const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${daysAgo(400)}T00:00:00Z`)) / 86_400_000;
  return v.baseKm + Math.round(days * v.kmPerDay);
}

/** Claims by the current drivers of vehicles 0–5 (see the assignment plan in seedAssets). */
const VEHICLE_CLAIMS: Array<{
  vehicle: number;
  sub: string;
  subSub: string | null;
  daysAgo: number;
  amount: number;
  stage: "pending" | "approved" | "paid";
}> = [
  { vehicle: 0, sub: "Petrol", subSub: "Super 98", daysAgo: 12, amount: 210.5, stage: "paid" },
  { vehicle: 0, sub: "Car Wash", subSub: null, daysAgo: 6, amount: 45, stage: "approved" },
  { vehicle: 0, sub: "Petrol", subSub: "Special 95", daysAgo: 1, amount: 185, stage: "pending" },
  { vehicle: 1, sub: "Oil Change", subSub: "Synthetic Oil", daysAgo: 9, amount: 240, stage: "approved" },
  { vehicle: 2, sub: "Diesel", subSub: null, daysAgo: 15, amount: 320, stage: "paid" },
  { vehicle: 3, sub: "Tyres", subSub: "Front Pair", daysAgo: 20, amount: 980, stage: "approved" },
  { vehicle: 4, sub: "Petrol", subSub: "Super 98", daysAgo: 3, amount: 150.75, stage: "pending" },
  { vehicle: 5, sub: "General Service", subSub: null, daysAgo: 4, amount: 650, stage: "pending" },
];

const OTHER_ASSETS = [
  { name: "ThinkPad X1 Carbon", category: "laptop", brand: "Lenovo", model: "X1 Gen 11", cost: 6499 },
  { name: "MacBook Pro 14", category: "laptop", brand: "Apple", model: "M3 Pro", cost: 8999 },
  { name: "Dell Latitude 5440", category: "laptop", brand: "Dell", model: "5440", cost: 4299 },
  { name: "OptiPlex Desktop", category: "desktop", brand: "Dell", model: "7010", cost: 3299 },
  { name: "iPhone 15", category: "phone", brand: "Apple", model: "15 128GB", cost: 3399 },
  { name: "Galaxy S24", category: "phone", brand: "Samsung", model: "S24", cost: 3199 },
  { name: "iPad Air", category: "tablet", brand: "Apple", model: "Air M2", cost: 2599 },
  { name: "27\" Monitor", category: "monitor", brand: "LG", model: "27UL850", cost: 1499 },
  { name: "Etisalat Data SIM", category: "sim_card", brand: "Etisalat", model: "Business 50GB", cost: 0 },
  { name: "Office Access Card", category: "access_card", brand: "HID", model: "iCLASS", cost: 45 },
  { name: "Cordless Drill Kit", category: "tools", brand: "Bosch", model: "GSR 18V", cost: 799 },
  { name: "Ergonomic Chair", category: "furniture", brand: "Herman Miller", model: "Aeron", cost: 5200 },
] as const;

const SERVICE_TYPES = [
  // The five defaults from the 09_asset_service_types seed.
  { code: "OIL_CHANGE", name: "Oil change", category: "vehicle", interval_days: 90, interval_km: 5000 },
  { code: "TYRE_CHANGE", name: "Tyre change", category: "vehicle", interval_days: 730, interval_km: 40000 },
  { code: "SERVICE", name: "Service", category: "vehicle", interval_days: 180, interval_km: 10000 },
  { code: "REGISTRATION", name: "Registration", category: "vehicle", interval_days: 365, interval_km: null },
  { code: "INSURANCE", name: "Insurance", category: "vehicle", interval_days: 365, interval_km: null },
  { code: "BRAKE_PADS", name: "Brake pads", category: "vehicle", interval_days: 365, interval_km: 30000 },
  { code: "BATTERY", name: "Battery replacement", category: "vehicle", interval_days: 730, interval_km: null },
  { code: "WHEEL_ALIGNMENT", name: "Wheel alignment", category: "vehicle", interval_days: 180, interval_km: 10000 },
  { code: "AC_SERVICE", name: "AC service", category: "vehicle", interval_days: 365, interval_km: null },
  { code: "SALIK_TAG", name: "Salik tag", category: "vehicle", interval_days: 365, interval_km: null },
  { code: "CAR_WASH", name: "Car wash", category: "vehicle", interval_days: 14, interval_km: null },
  { code: "LAPTOP_AMC", name: "Laptop AMC", category: "laptop", interval_days: 365, interval_km: null },
  { code: "ANTIVIRUS", name: "Antivirus renewal", category: "laptop", interval_days: 365, interval_km: null },
  { code: "BATTERY_CHECK", name: "Battery health check", category: "laptop", interval_days: 180, interval_km: null },
  { code: "SCREEN_REPAIR", name: "Screen repair", category: "phone", interval_days: null, interval_km: null },
  { code: "SIM_RENEWAL", name: "SIM plan renewal", category: "sim_card", interval_days: 30, interval_km: null },
  { code: "CALIBRATION", name: "Calibration", category: "tools", interval_days: 365, interval_km: null },
  { code: "DEEP_CLEAN", name: "Deep cleaning", category: "furniture", interval_days: 180, interval_km: null },
  { code: "INSPECTION", name: "Annual inspection", category: null, interval_days: 365, interval_km: null },
  { code: "WARRANTY_CLAIM", name: "Warranty claim", category: null, interval_days: null, interval_km: null },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const stamp = (db: Knex) => ({ created_at: db.fn.now(), updated_at: db.fn.now() });

/** Split a total (fils) by fractions; when they sum to 1 the last part takes the remainder. */
function splitAmounts(total: number, fractions: number[]): number[] {
  const sum = fractions.reduce((a, b) => a + b, 0);
  const amounts = fractions.map((f) => Math.floor(total * f));
  if (amounts.length > 0 && Math.abs(sum - 1) < 1e-9) {
    amounts[amounts.length - 1] = total - amounts.slice(0, -1).reduce((a, b) => a + b, 0);
  }
  return amounts.filter((a) => a > 0);
}

/** A solid-colour PNG, so asset photos render without shipping image files. */
function solidPng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const crcTable = range(256).map((n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = (crcTable[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // truecolour
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3).map((_, i) => [r, g, b][i % 3] as number)]);
  const pixels = zlib.deflateSync(Buffer.concat(range(height).map(() => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Steps ────────────────────────────────────────────────────────────────────

/** MySQL 8 returns information_schema columns upper-cased, hence the alias. */
async function listTables(db: Knex, database: string): Promise<string[]> {
  const [rows] = (await db.raw(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [database]
  )) as [Array<{ name: string }>];
  return rows.map((r) => r.name);
}

async function truncateAll(db: Knex, database: string): Promise<void> {
  const tables = await listTables(db, database);
  await db.raw("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const table of tables.filter((t) => !KEEP_TABLES.has(t))) {
      await db.raw("TRUNCATE TABLE ??", [table]);
    }
  } finally {
    await db.raw("SET FOREIGN_KEY_CHECKS = 1");
  }
  console.log(`Truncated ${tables.length - KEEP_TABLES.size} tables`);
}

async function seedPeople(trx: Knex.Transaction) {
  const adminHash = await bcrypt.hash("Admin@12345", 12);
  const employeeHash = await bcrypt.hash("Employee@12345", 12);

  await trx("admins").insert(
    range(N).map((i) => ({
      name: ADMIN_NAMES[i],
      email: i === 0 ? "admin@example.com" : `${ADMIN_NAMES[i]!.toLowerCase().replace(/[^a-z]+/g, ".")}@dxrecord.com`,
      password_hash: adminHash,
      role: i < 2 ? "SUPER_ADMIN" : "ADMIN",
      status: i % 9 === 8 ? "inactive" : "active",
      last_login_at: i % 3 === 0 ? trx.fn.now() : null,
      ...stamp(trx),
    }))
  );

  const roleIds = (await trx("roles").orderBy("id").pluck("id")) as number[];
  await trx("users").insert(
    range(N).map((i) => ({
      name: i === 0 ? "Super Admin" : PEOPLE[i],
      email: i === 0 ? "admin@example.com" : `user${i}@example.com`,
      password_hash: adminHash,
      role_id: i === 0 ? roleIds[0] : pick(roleIds, i),
      status: pick(["active", "active", "active", "pending", "inactive"] as const, i),
      email_verified: i % 4 !== 3,
      ...stamp(trx),
    }))
  );

  await trx("employees").insert(
    range(N).map((i) => {
      const name = PEOPLE[i]!;
      const year = 1980 + (i % 20);
      return {
        employee_code: `EMP${String(i + 1).padStart(3, "0")}`,
        emp_name: name,
        company_name: pick(COMPANIES, i),
        dob: `${year}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
        home_address: `${100 + i * 7} ${pick(STREETS, i)}, Building ${(i % 9) + 1}`,
        city_state: pick(CITIES, i),
        country: "United Arab Emirates",
        phone_no: `+9715${String(50000000 + i * 1234567).slice(0, 8)}`,
        whatsapp_no: i % 3 === 2 ? null : `+9715${String(50000000 + i * 1234567).slice(0, 8)}`,
        emirates_id_no: `784-${year}-${String(1000000 + i * 37171).slice(0, 7)}-${(i % 9) + 1}`,
        emirates_id_expiry_date: addDaysIso(today, 60 + i * 41),
        visa_expiry_date: addDaysIso(today, 20 + i * 37),
        passport_no: `P${String(4000000 + i * 104729).slice(0, 7)}`,
        passport_expiry_date: addDaysIso(today, 400 + i * 90),
        // Everyone who may drive a company vehicle has a licence.
        driving_license_no: i % 5 === 4 ? null : `DL${String(300000 + i * 7919)}`,
        driving_license_expiry_date: i % 5 === 4 ? null : addDaysIso(today, 90 + i * 53),
        email: i < 3 ? ["john.doe@example.com", "jane.smith@example.com", "ahmed.hassan@example.com"][i] : `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
        password_hash: employeeHash,
        status: i === 17 ? "inactive" : i === 18 ? "suspended" : "active",
        comments: "Sample employee – local seed",
        role: "employee",
        // Dropdowns (driver, whom) only list admin-created employees.
        created_by: 1,
        updated_by: 1,
        ...stamp(trx),
      };
    })
  );
}

async function seedCatalog(trx: Knex.Transaction) {
  await trx("categories").insert(
    CATEGORIES.map((name, i) => ({
      name,
      description: `${name} expenses`,
      status: i === 19 ? "inactive" : "active",
      is_vehicle_expense: VEHICLE_CATEGORIES.has(name),
      ...stamp(trx),
    }))
  );
  const categoryId = Object.fromEntries(
    ((await trx("categories").select("id", "name")) as Array<{ id: number; name: string }>).map((c) => [c.name, c.id])
  ) as Record<string, number>;
  // Service types don't exist yet; seedAssets links Oil Change → OIL_CHANGE etc.
  await trx("sub_categories").insert(
    SUB_CATEGORIES.map(([name, parent]) => ({
      category_id: categoryId[parent],
      name,
      description: `${name} sub category`,
      status: "active",
      ...stamp(trx),
    }))
  );
  const subs = Object.fromEntries(
    ((await trx("sub_categories").select("id", "name", "category_id")) as Array<{ id: number; name: string; category_id: number }>).map(
      (s) => [s.name, s]
    )
  );
  await trx("sub_sub_categories").insert(
    SUB_SUB_CATEGORIES.map(([name, parent]) => ({
      category_id: subs[parent]!.category_id,
      sub_category_id: subs[parent]!.id,
      name,
      description: `${name} sub sub category`,
      status: "active",
      ...stamp(trx),
    }))
  );
  await trx("payment_methods").insert(
    PAYMENT_METHODS.map(([name, code], i) => ({
      name,
      code,
      description: `${name} payment`,
      status: i === 4 || i === 13 ? "inactive" : "active",
      sort_order: i + 1,
      ...stamp(trx),
    }))
  );
}

async function seedExpenses(trx: Knex.Transaction) {
  const employees = (await trx("employees").where({ status: "active" }).orderBy("id").pluck("id")) as number[];
  const subSubs = (await trx("sub_sub_categories as ss")
    .join("categories as c", "c.id", "ss.category_id")
    .where("c.is_vehicle_expense", false)
    .orderBy("ss.id")
    .select("ss.id", "ss.name", "ss.category_id", "ss.sub_category_id")) as Array<{
    id: number;
    name: string;
    category_id: number;
    sub_category_id: number;
  }>;
  const methods = (await trx("payment_methods").where({ status: "active" }).orderBy("id").pluck("id")) as number[];
  // General claims: 3 pending, 3 approved, 3 paid, 3 rejected.
  const statuses = [
    ...range(3).map(() => ["pending", "pending"]),
    ...range(3).map(() => ["approved", "pending"]),
    ...range(3).map(() => ["approved", "paid"]),
    ...range(3).map(() => ["rejected", "rejected"]),
  ] as Array<[string, string]>;
  const general = N - VEHICLE_CLAIMS.length;
  await trx("expenses").insert(
    range(general).map((i) => {
      const cat = pick(subSubs, i);
      const [employeeStatus, adminStatus] = statuses[i]!;
      const reviewed = adminStatus !== "pending" || employeeStatus !== "pending";
      return {
        employee_id: pick(employees, i),
        whom: pick(employees, i + 3),
        date: daysAgo(3 + i * 6),
        amount: (35 + ((i * 137.25) % 1800)).toFixed(2),
        category_id: cat.category_id,
        sub_category_id: cat.sub_category_id,
        sub_sub_category_id: cat.id,
        description: `${cat.name} – sample expense`,
        payment_method_id: pick(methods, i),
        support_file: null,
        employee_status: employeeStatus,
        admin_status: adminStatus,
        review_note: adminStatus === "rejected" ? "Receipt missing" : null,
        reviewed_at: reviewed ? trx.fn.now() : null,
        reviewed_by: reviewed ? 1 : null,
        ...stamp(trx),
      };
    })
  );
  // Vehicle claims, by whoever drives the vehicle now.
  const subId = async (name: string, table: "sub_categories" | "sub_sub_categories") =>
    ((await trx(table).where({ name }).first("id", table === "sub_categories" ? "category_id" : "sub_category_id")) ?? {}) as {
      id: number;
      category_id?: number;
    };
  for (const [i, claim] of VEHICLE_CLAIMS.entries()) {
    const holder = (await trx("asset_assignments as a")
      .join("assets as s", "s.id", "a.asset_id")
      .where("s.asset_no", VEHICLES[claim.vehicle]!.assetNo)
      .whereNull("a.returned_date")
      .first("a.asset_id", "a.employee_id")) as { asset_id: number; employee_id: number };
    const sub = await subId(claim.sub, "sub_categories");
    const subSub = claim.subSub ? await subId(claim.subSub, "sub_sub_categories") : null;
    const date = daysAgo(claim.daysAgo);
    await trx("expenses").insert({
      employee_id: holder.employee_id,
      whom: holder.employee_id,
      date,
      amount: claim.amount.toFixed(2),
      category_id: sub.category_id,
      sub_category_id: sub.id,
      sub_sub_category_id: subSub?.id ?? null,
      description: `${claim.subSub ?? claim.sub} – ${VEHICLES[claim.vehicle]!.assetNo}`,
      payment_method_id: pick(methods, i),
      support_file: null,
      asset_id: holder.asset_id,
      odometer_km: kmOn(claim.vehicle, date),
      employee_status: claim.stage === "pending" ? "pending" : "approved",
      admin_status: claim.stage === "paid" ? "paid" : "pending",
      reviewed_at: claim.stage === "pending" ? null : trx.fn.now(),
      reviewed_by: claim.stage === "pending" ? null : 1,
      ...stamp(trx),
    });
  }

  // Approved/paid expenses get their reimbursement bill (and payment), as the app does.
  await syncExpenseReimbursements(trx, (_expense, billDate) => {
    const paid = addDaysIso(billDate, 7);
    return paid > today ? today : paid;
  }, "Seeded");

  // Approved before advances existed in this data: reimbursed in full.
  await trx("expenses")
    .where((q) => q.where("employee_status", "approved").orWhere("admin_status", "paid"))
    .update({ reimbursable_amount: trx.ref("amount") });

  // ...and approved vehicle claims their service record or odometer reading.
  const approved = (await trx("expenses").whereNotNull("asset_id").where("employee_status", "approved")) as ExpenseForVehicle[];
  for (const expense of approved) await assetMaintenanceService.linkExpense(trx, expense, 1);
}

async function seedFinance(trx: Knex.Transaction) {
  await trx("suppliers").insert(
    SUPPLIERS.map((company_name, i) => ({
      company_name,
      contact_name_1: pick(PEOPLE, i + 5),
      contact_name_2: i % 3 === 0 ? pick(PEOPLE, i + 9) : null,
      company_address: `Office ${200 + i}, ${pick(STREETS, i)}`,
      city_state: pick(CITIES, i),
      country: "United Arab Emirates",
      phone_1: `+9714${String(2200000 + i * 31337).slice(0, 7)}`,
      email: `accounts@${company_name.toLowerCase().replace(/[^a-z]+/g, "")}.ae`,
      status: i === 19 ? "inactive" : "active",
      ...stamp(trx),
    }))
  );
  await trx("customers").insert(
    CUSTOMERS.map((company_name, i) => ({
      company_name,
      contact_name_1: pick(PEOPLE, i + 2),
      company_address: `Unit ${300 + i}, ${pick(STREETS, i + 2)}`,
      city_state: pick(CITIES, i + 1),
      country: "United Arab Emirates",
      phone_1: `+9714${String(3300000 + i * 27191).slice(0, 7)}`,
      email: `finance@${company_name.toLowerCase().replace(/[^a-z]+/g, "")}.ae`,
      trn: i % 4 === 3 ? null : `100${String(234567800 + i * 1111111).slice(0, 9)}0003`,
      payment_terms: pick(["Net 30", "Net 45", "Net 60", "Due on receipt"], i),
      credit_limit: i % 4 === 3 ? null : `${50000 + i * 5000}.00`,
      status: i === 19 ? "inactive" : "active",
      ...stamp(trx),
    }))
  );

  const supplierIds = (await trx("suppliers").orderBy("id").pluck("id")) as number[];
  const customerIds = (await trx("customers").orderBy("id").pluck("id")) as number[];
  const methods = (await trx("payment_methods").where({ status: "active" }).orderBy("id").pluck("id")) as number[];
  const categoryId = (await trx("categories").orderBy("id").first("id"))?.id as number;

  // Top supplier bills and payments up to 20 each (expense reimbursements already made some).
  const billCount = Number((await trx("payable_bills").count({ n: "*" }).first())?.n ?? 0);
  let paymentCount = Number((await trx("payable_payments").count({ n: "*" }).first())?.n ?? 0);
  const billPlans: number[][] = [[1], [0.4, 0.6], [0.5, 0.5], [0.3], [1], [0.5, 0.2], [0.2, 0.3, 0.5], [1], [0.6, 0.4], [], [], []];
  for (const i of range(Math.max(0, N - billCount))) {
    const docDate = daysAgo(10 + i * 14);
    const totals = calculateTotals((1500 + i * 975) * 100, i % 6 === 5 ? 0 : 5);
    let fractions = billPlans[i % billPlans.length]!;
    fractions = fractions.slice(0, Math.max(0, N - paymentCount));
    const amounts = splitAmounts(totals.total, fractions);
    const paid = amounts.reduce((a, b) => a + b, 0);
    // The last bill stays a draft (only when nothing was paid on it).
    const initial: SettlementStatus = i === N - billCount - 1 && amounts.length === 0 ? "draft" : "open";
    const [billId] = await trx("payable_bills").insert({
      bill_no: `SUP-${1000 + i}`,
      payee_type: "supplier",
      supplier_id: pick(supplierIds, i),
      bill_date: docDate,
      due_date: addDaysIso(docDate, pick([14, 30, 45], i)),
      subtotal_amount: filsToDecimalString(totals.subtotal),
      vat_rate: i % 6 === 5 ? 0 : 5,
      vat_amount: filsToDecimalString(totals.vat),
      total_amount: filsToDecimalString(totals.total),
      amount_paid: filsToDecimalString(paid),
      category_id: categoryId,
      description: pick(BILL_LINES, i),
      source: "manual",
      status: deriveSettlementStatus(initial, totals.total, paid, "open"),
      ...stamp(trx),
    });
    for (const [n, amount] of amounts.entries()) {
      const date = addDaysIso(docDate, 5 + n * 7);
      await trx("payable_payments").insert({
        bill_id: billId,
        payment_date: date > today ? today : date,
        amount: filsToDecimalString(amount),
        payment_method_id: pick(methods, i + n),
        reference: `TT-${70000 + i * 10 + n}`,
        ...stamp(trx),
      });
      paymentCount += 1;
    }
  }

  // 20 invoices, 20 receipts.
  const invoicePlans: number[][] = [[1], [0.5, 0.5], [0.3], [1], [0.4, 0.6], [], [1], [0.25, 0.25], [1], [], [0.5], [1], [0.6, 0.4], [0.5, 0.3], [1], [0.2], [], [1], [], []];
  let receipts = 0;
  for (const i of range(N)) {
    const docDate = daysAgo(180 - i * 9);
    const totals = calculateTotals((2400 + i * 1325) * 100, i % 7 === 6 ? 0 : 5);
    const fractions = invoicePlans[i]!.slice(0, Math.max(0, N - receipts));
    const amounts = splitAmounts(totals.total, fractions);
    const received = amounts.reduce((a, b) => a + b, 0);
    const initial: SettlementStatus = i === N - 1 ? "draft" : i === 9 ? "cancelled" : "sent";
    const invoiceNo = await nextDocumentNumber(trx, DocumentSequences.RECEIVABLE_INVOICE, Number(docDate.slice(0, 4)));
    const [invoiceId] = await trx("receivable_invoices").insert({
      invoice_no: invoiceNo,
      customer_id: pick(customerIds, i),
      invoice_date: docDate,
      due_date: addDaysIso(docDate, pick([30, 45, 60], i)),
      subtotal_amount: filsToDecimalString(totals.subtotal),
      vat_rate: i % 7 === 6 ? 0 : 5,
      vat_amount: filsToDecimalString(totals.vat),
      total_amount: filsToDecimalString(totals.total),
      amount_received: filsToDecimalString(received),
      description: pick(INVOICE_LINES, i),
      po_reference: i % 3 === 0 ? `PO-${4400 + i}` : null,
      status: deriveSettlementStatus(initial, totals.total, received, "sent"),
      ...stamp(trx),
    });
    for (const [n, amount] of amounts.entries()) {
      const date = addDaysIso(docDate, 15 + n * 20);
      await trx("receivable_receipts").insert({
        invoice_id: invoiceId,
        receipt_date: date > today ? today : date,
        amount: filsToDecimalString(amount),
        payment_method_id: pick(methods, i + n),
        reference: `RCPT-${50000 + i * 10 + n}`,
        ...stamp(trx),
      });
      receipts += 1;
    }
  }

  await trx("invoice_branding").insert({ signatory_name: "Kathiravan N", signatory_title: "Managing Director", ...stamp(trx) });
}

async function seedAssets(trx: Knex.Transaction, uploadRoot: string) {
  const employees = (await trx("employees").where({ status: "active" }).orderBy("id").pluck("id")) as number[];
  const year = Number(today.slice(0, 4));

  const vehicleIds: number[] = [];
  for (const v of VEHICLES) {
    const [id] = await trx("assets").insert({
      asset_no: v.assetNo,
      name: v.name,
      category: "vehicle",
      brand: v.brand,
      model: v.model,
      serial_no: `VIN${v.assetNo.replace(/[^0-9]/g, "")}${v.brand.slice(0, 2).toUpperCase()}`,
      purchase_date: daysAgo(400),
      purchase_cost: v.cost.toFixed(2),
      warranty_expiry: addDaysIso(today, 330),
      condition: "good",
      status: "available",
      notes: "Company vehicle",
      ...stamp(trx),
    });
    vehicleIds.push(id as number);
  }
  const otherIds: number[] = [];
  for (const [i, a] of OTHER_ASSETS.entries()) {
    const [id] = await trx("assets").insert({
      asset_no: await nextDocumentNumber(trx, DocumentSequences.ASSET, year),
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model,
      serial_no: `SN-${a.brand.slice(0, 3).toUpperCase()}-${10000 + i * 731}`,
      purchase_date: daysAgo(100 + i * 30),
      purchase_cost: a.cost.toFixed(2),
      warranty_expiry: a.cost > 1000 ? addDaysIso(today, 30 + i * 45) : null,
      condition: pick(["new", "good", "good", "fair"] as const, i),
      status: i === 10 ? "in_repair" : i === 11 ? "retired" : "available",
      notes: null,
      ...stamp(trx),
    });
    otherIds.push(id as number);
  }


  // Assignments: 6 vehicles with a returned driver, then 6 current drivers;
  // 8 other assets: 2 returned, 6 current. 20 in all.
  const plan: Array<{ assetId: number; vehicle: number | null; from: string; to: string | null }> = [];
  for (const v of range(6)) plan.push({ assetId: vehicleIds[v]!, vehicle: v, from: daysAgo(200), to: daysAgo(90 + v * 5) });
  for (const v of range(6)) plan.push({ assetId: vehicleIds[v]!, vehicle: v, from: daysAgo(80 - v * 5), to: null });
  for (const o of range(2)) plan.push({ assetId: otherIds[o]!, vehicle: null, from: daysAgo(150), to: daysAgo(60) });
  for (const o of range(6)) plan.push({ assetId: otherIds[o]!, vehicle: null, from: daysAgo(45 - o * 5), to: null });

  const assignmentIds: number[] = [];
  for (const [i, a] of plan.entries()) {
    const odometerOut = a.vehicle === null ? null : kmOn(a.vehicle, a.from);
    const odometerIn = a.vehicle === null || !a.to ? null : kmOn(a.vehicle, a.to);
    const [id] = await trx("asset_assignments").insert({
      asset_id: a.assetId,
      employee_id: pick(employees, i * 3),
      assigned_date: a.from,
      expected_return_date: a.to ? null : i % 4 === 0 ? daysAgo(-30) : null,
      condition_out: "good",
      notes: a.vehicle === null ? null : "Handed over with fuel card",
      assigned_by: 1,
      acknowledged_at: i % 5 === 4 ? null : trx.fn.now(),
      returned_date: a.to,
      condition_in: a.to ? "good" : null,
      return_notes: a.to ? "Returned in good condition" : null,
      returned_by: a.to ? 1 : null,
      odometer_out: odometerOut,
      odometer_in: odometerIn,
      ...stamp(trx),
    });
    assignmentIds.push(id as number);
    if (!a.to) await trx("assets").where({ id: a.assetId }).update({ status: "assigned" });
  }

  // 20 service types.
  await trx("asset_service_types").insert(SERVICE_TYPES.map((t, i) => ({ ...t, sort_order: i + 1, status: "active", ...stamp(trx) })));
  const typeId = Object.fromEntries(
    ((await trx("asset_service_types").select("id", "code")) as Array<{ id: number; code: string }>).map((t) => [t.code, t.id])
  ) as Record<string, number>;
  const typeByCode = Object.fromEntries(SERVICE_TYPES.map((t) => [t.code, t]));
  // Approved claims under these sub categories create a service record of the type.
  for (const [name, , code] of SUB_CATEGORIES) {
    if (code) await trx("sub_categories").where({ name }).update({ service_type_id: typeId[code] });
  }

  // 20 service records: vehicles get oil changes, services, insurance and registration;
  // some are due soon or overdue so the due report has something to show.
  const records: Array<{ vehicle: number; code: string; daysAgo: number; odometer: boolean; cost: number }> = [
    { vehicle: 0, code: "OIL_CHANGE", daysAgo: 85, odometer: true, cost: 180 },
    { vehicle: 0, code: "INSURANCE", daysAgo: 350, odometer: false, cost: 3200 },
    { vehicle: 0, code: "REGISTRATION", daysAgo: 340, odometer: false, cost: 450 },
    { vehicle: 1, code: "OIL_CHANGE", daysAgo: 30, odometer: true, cost: 160 },
    { vehicle: 1, code: "SERVICE", daysAgo: 190, odometer: true, cost: 950 },
    { vehicle: 1, code: "INSURANCE", daysAgo: 120, odometer: false, cost: 2100 },
    { vehicle: 2, code: "OIL_CHANGE", daysAgo: 100, odometer: true, cost: 210 },
    { vehicle: 2, code: "TYRE_CHANGE", daysAgo: 60, odometer: true, cost: 2400 },
    { vehicle: 2, code: "REGISTRATION", daysAgo: 200, odometer: false, cost: 450 },
    { vehicle: 3, code: "SERVICE", daysAgo: 45, odometer: true, cost: 1800 },
    { vehicle: 3, code: "BRAKE_PADS", daysAgo: 300, odometer: true, cost: 650 },
    { vehicle: 3, code: "INSURANCE", daysAgo: 370, odometer: false, cost: 4100 },
    { vehicle: 4, code: "OIL_CHANGE", daysAgo: 70, odometer: true, cost: 170 },
    { vehicle: 4, code: "AC_SERVICE", daysAgo: 150, odometer: false, cost: 380 },
    { vehicle: 5, code: "OIL_CHANGE", daysAgo: 20, odometer: true, cost: 150 },
    { vehicle: 5, code: "SALIK_TAG", daysAgo: 355, odometer: false, cost: 100 },
    { vehicle: 6, code: "SERVICE", daysAgo: 170, odometer: true, cost: 1350 },
    { vehicle: 6, code: "WHEEL_ALIGNMENT", daysAgo: 95, odometer: true, cost: 220 },
    { vehicle: 7, code: "OIL_CHANGE", daysAgo: 92, odometer: true, cost: 175 },
    { vehicle: 7, code: "BATTERY", daysAgo: 250, odometer: false, cost: 520 },
  ];
  let readings = 0;
  for (const [i, r] of records.entries()) {
    const type = typeByCode[r.code]!;
    const start = daysAgo(r.daysAgo);
    const km = r.odometer ? kmOn(r.vehicle, start) : null;
    const [recordId] = await trx("asset_service_records").insert({
      asset_id: vehicleIds[r.vehicle],
      service_type_id: typeId[r.code],
      employee_id: pick(employees, i + 1),
      start_date: start,
      end_date: type.interval_days ? addDaysIso(start, type.interval_days) : null,
      odometer_km: km,
      next_due_km: km !== null && type.interval_km ? km + type.interval_km : null,
      cost: r.cost.toFixed(2),
      reference_no: r.code === "INSURANCE" ? `POL-${880000 + i}` : r.code === "REGISTRATION" ? `MULKIYA-${55000 + i}` : `INV-WS-${3000 + i}`,
      notes: null,
      created_by: 1,
      updated_by: 1,
      ...stamp(trx),
    });
    if (km !== null && readings < N) {
      await trx("asset_odometer_readings").insert({
        asset_id: vehicleIds[r.vehicle],
        reading_km: km,
        reading_date: start,
        source: "service",
        service_record_id: recordId,
        employee_id: pick(employees, i + 1),
        created_by: 1,
        created_at: trx.fn.now(),
      });
      readings += 1;
    }
  }
  // Fill the readings up to 20 with recent driver reports for the current drivers.
  for (const [i, a] of plan.entries()) {
    if (readings >= N) break;
    if (a.vehicle === null || a.to) continue;
    for (const ago of [14, 2]) {
      if (readings >= N) break;
      const date = daysAgo(ago);
      await trx("asset_odometer_readings").insert({
        asset_id: a.assetId,
        reading_km: kmOn(a.vehicle, date),
        reading_date: date,
        source: "employee",
        assignment_id: assignmentIds[i],
        employee_id: pick(employees, i * 3),
        notes: ago === 2 ? "Weekly update" : null,
        created_by: null,
        created_at: trx.fn.now(),
      });
      readings += 1;
    }
  }

  // 20 photos: one per asset.
  const dir = path.join(uploadRoot, "images", "assets");
  fs.mkdirSync(dir, { recursive: true });
  const photos = [...vehicleIds, ...otherIds].slice(0, N);
  for (const [i, assetId] of photos.entries()) {
    const color: [number, number, number] = [(60 + i * 47) % 256, (120 + i * 83) % 256, (180 + i * 29) % 256];
    const file = `seed-asset-${assetId}-${i + 1}.png`;
    const png = solidPng(320, 240, color);
    fs.writeFileSync(path.join(dir, file), png);
    await trx("asset_images").insert({
      asset_id: assetId,
      file_path: path.posix.join("images", "assets", file),
      original_name: `photo-${i + 1}.png`,
      mime_type: "image/png",
      size_bytes: png.length,
      created_by: 1,
      created_at: trx.fn.now(),
    });
  }
}

/**
 * 20 employee account entries: advances (some topped up), returns, adjustments
 * and one voided mistake. Pending claims are left for an admin to approve, so
 * approving them shows the advance being drawn down (employee #3's advance is
 * smaller than their pending claim, so it splits).
 */
async function seedAccounts(trx: Knex.Transaction) {
  const employees = (await trx("employees").where({ status: "active" }).orderBy("id").pluck("id")) as number[];
  const cash = ((await trx("payment_methods").where({ code: "CASH" }).first("id")) as { id: number }).id;
  const bank = ((await trx("payment_methods").where({ code: "BANK_TRANSFER" }).first("id")) as { id: number }).id;
  type Seed = { emp: number; type: "advance" | "return" | "adjustment"; amount: number; ago: number; voided?: boolean; notes?: string };
  const entries: Seed[] = [
    { emp: 0, type: "advance", amount: 2000, ago: 20 },
    { emp: 1, type: "advance", amount: 1000, ago: 19 },
    { emp: 2, type: "advance", amount: 200, ago: 18 },
    { emp: 3, type: "advance", amount: 1500, ago: 18 },
    { emp: 4, type: "advance", amount: 500, ago: 17 },
    { emp: 5, type: "advance", amount: 3000, ago: 16 },
    { emp: 6, type: "advance", amount: 750, ago: 15 },
    { emp: 7, type: "advance", amount: 1200, ago: 15 },
    { emp: 8, type: "advance", amount: 400, ago: 14 },
    { emp: 9, type: "advance", amount: 2500, ago: 14 },
    { emp: 12, type: "advance", amount: 1000, ago: 13 },
    { emp: 15, type: "advance", amount: 800, ago: 12 },
    { emp: 0, type: "advance", amount: 500, ago: 8, notes: "Top-up for site visits" },
    { emp: 5, type: "advance", amount: 1000, ago: 6, notes: "Top-up" },
    { emp: 3, type: "return", amount: 500, ago: 7, notes: "Unused cash returned" },
    { emp: 9, type: "return", amount: 1000, ago: 5 },
    { emp: 7, type: "return", amount: 200, ago: 3 },
    { emp: 4, type: "adjustment", amount: -50, ago: 4, notes: "Lost receipt written off" },
    { emp: 6, type: "adjustment", amount: 25, ago: 2, notes: "Cash count correction" },
    { emp: 8, type: "advance", amount: 4000, ago: 10, voided: true, notes: "Entered twice" },
  ];
  for (const [i, e] of entries.entries()) {
    const signed = e.type === "return" ? -e.amount : e.amount;
    await trx("employee_account_entries").insert({
      employee_id: pick(employees, e.emp),
      entry_date: daysAgo(e.ago),
      type: e.type,
      amount: signed.toFixed(2),
      payment_method_id: e.type === "adjustment" ? null : i % 3 === 0 ? bank : cash,
      reference: e.type === "adjustment" ? null : `ADV-${1000 + i}`,
      notes: e.notes ?? null,
      created_by: 1,
      created_at: trx.fn.now(),
      voided_at: e.voided ? trx.fn.now() : null,
      voided_by: e.voided ? 1 : null,
      void_reason: e.voided ? "Duplicate entry" : null,
    });
  }
}

async function main(): Promise<void> {
  const appEnv = process.env.APP_ENV;
  const connection = knexConfig.connection as Knex.MySql2ConnectionConfig;
  const host = connection.host ?? "";
  const database = connection.database ?? "";

  if (appEnv !== "local" || !LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run: APP_ENV=${appEnv}, DB_HOST=${host}. This script is for the local database only.`);
  }
  if (!process.argv.includes("--yes")) {
    console.log(`This deletes ALL data in ${database} @ ${host}. Re-run with --yes to continue.`);
    return;
  }

  const db = knex(knexConfig);
  try {
    console.log(`Database: ${database} @ ${host}`);
    const [batch, migrations] = await db.migrate.latest();
    console.log(migrations.length ? `Migrations (batch ${batch}): ${migrations.join(", ")}` : "Migrations: already up to date");

    await truncateAll(db, database);
    const { seed: seedRoles } = await import("../src/database/seeds/01_roles_permissions");
    await seedRoles(db);

    const uploadRoot = path.resolve(__dirname, "..", process.env.UPLOAD_PATH ?? "uploads");
    await db.transaction(async (trx) => {
      await seedPeople(trx);
      await seedCatalog(trx);
      // Vehicles and drivers first: vehicle claims need them.
      await seedAssets(trx, uploadRoot);
      await seedExpenses(trx);
      await seedFinance(trx);
      await seedAccounts(trx);
    });

    const tables = await listTables(db, database);
    console.log("\nRows per table:");
    for (const table of tables.filter((t) => !KEEP_TABLES.has(t))) {
      const row = await db(table).count({ n: "*" }).first();
      console.log(`  ${table.padEnd(26)} ${row?.n}`);
    }
    console.log("\nAdmin login: admin@example.com / Admin@12345");
    console.log("Employee login: john.doe@example.com / Employee@12345");
  } finally {
    await db.destroy();
    // The app's own pool, used by the linked-expense helper.
    await appDb.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
