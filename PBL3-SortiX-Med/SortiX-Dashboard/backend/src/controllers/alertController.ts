import { sendEmailNotification, sendTelegramNotification } from "../services/alertNotificationService";
import { AlertPayloadSchema, AlertPayload } from "../utils/alertPayload";
import { validateBody } from "../middlewares/validateMiddleware";

export const AlertController = {
  async email(body: unknown) {
    const validated = validateBody<AlertPayload>(AlertPayloadSchema, body);
    if (!validated.success || !validated.data) {
      return { status: 400, body: { success: false, message: validated.error || "Dữ liệu cảnh báo không hợp lệ" } };
    }

    const result = await sendEmailNotification(validated.data);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },

  async telegram(body: unknown) {
    const validated = validateBody<AlertPayload>(AlertPayloadSchema, body);
    if (!validated.success || !validated.data) {
      return { status: 400, body: { success: false, message: validated.error || "Dữ liệu cảnh báo không hợp lệ" } };
    }

    const result = await sendTelegramNotification(validated.data);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },
};
