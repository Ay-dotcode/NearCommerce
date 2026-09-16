import { SUPPORT_EMAIL, SUPPORT_FAQ_URL, SUPPORT_PHONE } from "@/constants";
import { Request, Response } from "express";

export const getSupportChannels = (_req: Request, res: Response) => {
  return res.status(200).json({
    channels: {
      email: SUPPORT_EMAIL,
      phone: SUPPORT_PHONE,
      faq_url: SUPPORT_FAQ_URL,
    },
    operating_hours: "24/7",
  });
};
