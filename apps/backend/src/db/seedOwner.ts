import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  console.log("Seeding store owner user and store...");

  // 1. Create STORE_OWNER user
  const email = "joseyowolabi@gmail.com";
  const password = "Password12++";
  const fullName = "Joseph Owolabi";
  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert user
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at, is_suspended)
     VALUES ($1, $2, $3, 'STORE_OWNER', NOW(), false)
     ON CONFLICT (email) DO UPDATE 
     SET password_hash = EXCLUDED.password_hash,
         role = 'STORE_OWNER',
         email_verified_at = NOW(),
         is_suspended = false
     RETURNING id, email, role, full_name`,
    [email, passwordHash, fullName],
  );

  const user = userResult.rows[0];
  console.log("Seeded user:", user);

  // 2. Create store for this owner
  const storeResult = await pool.query(
    `SELECT id, name FROM stores WHERE owner_id = $1 LIMIT 1`,
    [user.id],
  );

  let storeId: string;
  if (storeResult.rows.length === 0) {
    const newStore = await pool.query(
      `INSERT INTO stores (owner_id, name, description, address, latitude, longitude, timezone, opening_hours, is_suspended)
       VALUES ($1, 'Downtown Fresh Market', 'Local organic groceries & pantry essentials', '123 Market St, San Francisco, CA', 37.7749, -122.4194, 'America/Los_Angeles', '{"monday": {"open": "08:00", "close": "20:00"}}'::jsonb, false)
       RETURNING id, name`,
      [user.id],
    );
    storeId = newStore.rows[0].id;
    console.log("Created store:", newStore.rows[0]);
  } else {
    storeId = storeResult.rows[0].id;
    console.log("Store exists:", storeResult.rows[0]);
  }

  // 3. Create initial sample products
  const productsResult = await pool.query(
    `SELECT id, name FROM products WHERE store_id = $1`,
    [storeId],
  );

  if (productsResult.rows.length === 0) {
    const productsToInsert = [
      {
        name: "Organic Whole Milk (1 Gallon)",
        price: 4.99,
        quantity: 24,
        is_published: true,
        image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150",
        last_verified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        name: "Artisan Sourdough Bread",
        price: 6.5,
        quantity: 12,
        is_published: true,
        image_url:
          "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04",
        last_verified_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago (stale)
      },
      {
        name: "Fresh Hass Avocados (Pack of 4)",
        price: 5.99,
        quantity: 8,
        is_published: true,
        image_url:
          "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578",
        last_verified_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Seasonal Honey Honeycomb (Draft)",
        price: 14.0,
        quantity: 3,
        is_published: false,
        image_url: null,
        last_verified_at: new Date(),
      },
    ];

    for (const prod of productsToInsert) {
      await pool.query(
        `INSERT INTO products (store_id, name, price, quantity, is_published, image_url, last_verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          storeId,
          prod.name,
          prod.price,
          prod.quantity,
          prod.is_published,
          prod.image_url,
          prod.last_verified_at,
        ],
      );
    }
    console.log(
      `Inserted ${productsToInsert.length} sample products for store.`,
    );
  } else {
    console.log(`Store already has ${productsResult.rows.length} products.`);
  }

  await pool.end();
  console.log("Seeding completed successfully!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  pool.end();
  process.exit(1);
});
