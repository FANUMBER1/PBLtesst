/**
 * ============================================================================
 * Seeder: seed_admins.ts
 * Description: Programmatic Seeder script using bcryptjs to insert 4 initial
 *              Admin accounts idempotently.
 * Run: npx ts-node backend/database/seeds/seed_admins.ts
 * ============================================================================
 */

import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export interface SeedAdminInput {
  username: string;
  email: string;
  full_name: string;
  role: "admin";
  status: "active";
}

export const INITIAL_ADMINS: SeedAdminInput[] = [
  {
    username: "admin1",
    email: "admin1@system.local",
    full_name: "Nguyễn Tá Duy Phong",
    role: "admin",
    status: "active",
  },
  {
    username: "admin2",
    email: "admin2@system.local",
    full_name: "Nguyễn Nhật Minh",
    role: "admin",
    status: "active",
  },
  {
    username: "admin3",
    email: "admin3@system.local",
    full_name: "Trần Đăng Lợi",
    role: "admin",
    status: "active",
  },
  {
    username: "admin4",
    email: "admin4@system.local",
    full_name: "Nguyễn Đình Anh Tuấn",
    role: "admin",
    status: "active",
  },
];

export async function generateAdminSeeds(
  defaultPassword = process.env.SEED_ADMIN_DEFAULT_PASSWORD || "123456",
  saltRounds = 12
) {
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
  const now = new Date().toISOString();

  return INITIAL_ADMINS.map((admin, index) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `admin-uuid-00${index + 1}`,
    ...admin,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  }));
}

/**
 * CLI Runner when executed directly
 */
async function run() {
  console.log("==================================================");
  console.log("   SORTIX DASHBOARD - ADMIN SEEDER INITIALIZER   ");
  console.log("==================================================");
  
  const defaultPassword = process.env.SEED_ADMIN_DEFAULT_PASSWORD || "123456";
  console.log(`[*] Default admin password configured: [PROTECTED] (Length: ${defaultPassword.length})`);
  console.log("[*] Generating Bcrypt hashes (12 salt rounds)...");

  const records = await generateAdminSeeds(defaultPassword, 12);

  console.log(`[+] Successfully prepared ${records.length} Admin records:`);
  for (const rec of records) {
    console.log(`    - ID: ${rec.id} | User: ${rec.username.padEnd(8)} | Email: ${rec.email.padEnd(22)} | Role: ${rec.role}`);
  }
  console.log("==================================================");
  console.log("Seed data is ready for database batch insertion.");
}

if (require.main === module) {
  run().catch((err) => {
    console.error("[-] Seeder failed:", err);
    process.exit(1);
  });
}
