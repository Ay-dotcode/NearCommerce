import { db } from "@/config/database";
import redisClient, { connectRedis } from "@/config/redis";
import { seedAdmin } from "@/db/seedAdmin";
import { seedOwner } from "@/db/seedOwner";
import fs from "fs";
import path from "path";

async function clearDbAndCache() {
  console.log("🧹 Clearing database and Redis cache...");

  try {
    // 1. Flush Redis Cache
    await connectRedis();
    await redisClient.flushAll();
    console.log("✅ Redis cache flushed successfully.");

    // 2. Drop and Re-create Public Schema in PostgreSQL
    await db.query("DROP SCHEMA public CASCADE;");
    await db.query("CREATE SCHEMA public;");
    await db.query("GRANT ALL ON SCHEMA public TO public;");
    await db.query("DROP TYPE IF EXISTS user_role CASCADE;");
    await db.query("DROP TYPE IF EXISTS member_role CASCADE;");
    console.log("✅ PostgreSQL public schema reset.");

    // 3. Re-run Migrations
    const migrationsDir = path.join(__dirname, "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      console.log(`📌 Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await db.query(sql);
    }
    console.log("✅ Migrations applied successfully.");

    // 4. Run Seeders Automatically
    console.log("🌱 Seeding default database records...");
    await seedAdmin(db);
    await seedOwner(db);
    console.log("✅ Database seeded successfully.");

    console.log("🎉 Database and cache cleared & seeded completely!");
  } catch (error) {
    console.error("❌ Error while clearing database and cache:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  }
}

clearDbAndCache();
