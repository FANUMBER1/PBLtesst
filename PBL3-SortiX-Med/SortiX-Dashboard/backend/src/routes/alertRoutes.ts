import { AlertController } from "../controllers/alertController";

export const AlertRoutes = {
  handleEmail(body: unknown) {
    return AlertController.email(body);
  },

  handleTelegram(body: unknown) {
    return AlertController.telegram(body);
  },
};
