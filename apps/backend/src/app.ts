import { db } from "@/config/database";
import authRouter from "@/features/auth/api/auth.routes";
import listsRouter from "@/features/lists/api/list.routes";
import searchRouter from "@/features/search/api/search.routes";
import supportRouter from "@/features/support/api/support.routes";
import storeRouter from "@/routes/storeRoutes";
import { RegisterSchema } from "@nearcommerce/api";
import cors from "cors";
import express, { Request, Response } from "express";
import { z } from "zod";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/search", searchRouter);
app.use("/support", supportRouter);
app.use("/lists", listsRouter);
app.use("/api/stores", storeRouter);
app.use("/stores", storeRouter);

app.get("/test-db", async (_req: Request, res: Response) => {
  try {
    const result = await db.query("SELECT NOW() as current_time, version()");
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

app.post("/test-valid", (req: Request, res: Response): void => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    res.json({
      success: true,
      message: "Data is perfectly valid!",
      data: validatedData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});
