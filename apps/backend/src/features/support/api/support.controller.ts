import { Request, Response } from "express";

export const getSupportChannels = (req: Request, res: Response) => {
  return res.status(200).json({
    channels: {
      email: "joseyowolabi@gmail.com",
      phone: "+905338856528",
      faq_url: "https://nearcommerce.local/faq",
    },
    operating_hours: "24/7",
  });
};
