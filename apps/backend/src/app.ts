import authRouter from "@/features/auth/api/auth.routes";
import listsRouter from "@/features/lists/api/list.routes";
import searchRouter from "@/features/search/api/search.routes";
import supportRouter from "@/features/support/api/support.routes";
import adminRouter from "@/routes/admin.routes";
import productRouter from "@/routes/productRoutes";
import reviewRouter from "@/routes/reviewRoutes";
import storeRouter from "@/routes/storeRoutes";
import cors from "cors";
import express from "express";

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.use("/auth", authRouter);
app.use("/search", searchRouter);
app.use("/support", supportRouter);
app.use("/lists", listsRouter);
app.use("/api/stores", storeRouter);
app.use("/stores", storeRouter);
app.use("/api/products", productRouter);
app.use("/products", productRouter);
app.use("/api/reviews", reviewRouter);
app.use("/reviews", reviewRouter);
app.use("/api/admin", adminRouter);
app.use("/admin", adminRouter);
