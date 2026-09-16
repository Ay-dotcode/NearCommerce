import { app } from "@/app";
import request from "supertest";

describe("Support Integration Tests", () => {
  describe("GET /support", () => {
    it("should return 200 with the correct support channels and operating hours", async () => {
      const response = await request(app).get("/support");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        channels: {
          email: "support@nearcommerce.local",
          phone: "+1-800-NEARCOM",
          faq_url: "https://nearcommerce.local/faq",
        },
        operating_hours: "24/7",
      });
    });
  });
});
