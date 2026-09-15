import { app } from "@/app";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 NearCommerce Backend running on http://localhost:${PORT}`);
  console.log(`➡️  Test Database: GET http://localhost:${PORT}/test-db`);
  console.log(`➡️  Test Schema:   POST http://localhost:${PORT}/test-valid`);
  console.log(`➡️  Register:      POST http://localhost:${PORT}/auth/register`);
});
