import { Router } from "express";
import { getSupportChannels } from "./support.controller";

const supportRouter = Router();
supportRouter.get("/", getSupportChannels);

export default supportRouter;
