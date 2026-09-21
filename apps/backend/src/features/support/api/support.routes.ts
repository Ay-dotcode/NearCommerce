import { getSupportChannels } from "@/features/support/api/support.controller";
import { Router } from "express";

const supportRouter = Router();
supportRouter.get("/", getSupportChannels);

export default supportRouter;
