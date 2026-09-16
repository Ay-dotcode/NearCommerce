import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants";
import { Request, Response } from "express";

export const getSupportChannels = (_req: Request, res: Response) => {
  return res.status(200).json({
    channels: {
      email: SUPPORT_EMAIL,
      phone: SUPPORT_PHONE,
    },
    operating_hours: "24/7",
  });
};
