import { registerUser } from "@/features/auth/api/auth.controller";
import { Router } from "express";

const authRouter = Router();
authRouter.post("/register", registerUser);

export default authRouter;
