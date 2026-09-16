import { app } from "@/app";
import { DEFAULT_PORT, ENV_PATH } from "@/constants";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`🚀 NearCommerce Backend running on http://localhost:${PORT}`);
  console.log(`➡️  Test Database: GET http://localhost:${PORT}/test-db`);
  console.log(`➡️  Test Schema:   POST http://localhost:${PORT}/test-valid`);
  console.log(`➡️  Register:      POST http://localhost:${PORT}/auth/register`);
});
