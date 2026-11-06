import fs from "node:fs";
import path from "node:path";

function loadDotEnv(): void {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", ".env"),
  ];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) return;

  try {
    const contents = fs.readFileSync(filePath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (err) {
    console.warn("[ENV] Không thể đọc file .env:", err);
  }
}

loadDotEnv();

export const ENV = {
  PORT: Number(process.env.PORT || 5000),
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET?.trim() || "",
  AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET?.trim() || process.env.INTERNAL_API_SECRET?.trim() || "",
  
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID?.trim() || "",
  
  // SMTP
  SMTP_HOST: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER?.trim() || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO?.trim() || "",
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL?.trim() || "",
  MQTT_USERNAME: process.env.MQTT_USERNAME?.trim() || "",
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || "",
  MQTT_CONTROL_SECRET: process.env.MQTT_CONTROL_SECRET?.trim() || process.env.SORTIX_CONTROL_SECRET?.trim() || "",
  SORTIX_CONTROL_SECRET: process.env.SORTIX_CONTROL_SECRET?.trim() || process.env.MQTT_CONTROL_SECRET?.trim() || "",
  DEVICE_TOKEN: process.env.DEVICE_TOKEN?.trim() || process.env.SORTIX_DEVICE_TOKEN?.trim() || "",
};
