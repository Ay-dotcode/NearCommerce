import express, { Request, Response } from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { RegisterSchema } from "@nearcommerce/api";
import { z } from "zod";

dotenv.config({ path: "../../.env" });

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/test-db", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW() as current_time, version()");
    res.json({
      success: true,
      message: "Successfully connected to Neon PostgreSQL!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post("/test-validation", (req: Request, res: Response): void => {
  try {
    const validatedData = RegisterSchema.parse(req.body);
    
    res.json({
      success: true,
      message: "Data is perfectly valid!",
      data: validatedData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Zod uses .issues instead of .errors
      res.status(400).json({ success: false, errors: error.issues });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 NearCommerce Backend running on http://localhost:${PORT}`);
  console.log(`➡️  Test Database: GET http://localhost:${PORT}/test-db`);
  console.log(`➡️  Test Schema:   POST http://localhost:${PORT}/test-validation`);
});
