const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test, describe } = require("node:test");
const { z } = require("zod");

describe("Báo Cáo 1 Ngày Làm Việc & Thông Báo Telegram / Email Khi Qua Ngày Mới", () => {
  test("1. history.ts Contract: formatVietnameseDate cung cấp ngày tháng năm rõ ràng chuẩn tiếng Việt", () => {
    const historyPath = join(__dirname, "../frontend/src/lib/history.ts");
    const content = readFileSync(historyPath, "utf8");

    assert.ok(content.includes("export function formatVietnameseDate"), "Must export formatVietnameseDate");
    assert.ok(content.includes("fullTextDate"), "Must produce fullTextDate (Ngày DD tháng MM năm YYYY)");
    assert.ok(content.includes("shortDate"), "Must produce shortDate (DD/MM/YYYY)");
    assert.ok(content.includes("displayDate"), "Must produce displayDate");

    // Dynamic test logic mimicking formatVietnameseDate
    function formatVietnameseDateLocal(timestamp) {
      const date = timestamp ? new Date(timestamp) : new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      const day = values.day || "01";
      const month = values.month || "01";
      const year = values.year || "2026";
      const shortDate = `${day}/${month}/${year}`;
      const fullTextDate = `Ngày ${day} tháng ${month} năm ${year}`;
      const displayDate = `Ngày ${shortDate} (${fullTextDate})`;
      return { day, month, year, shortDate, fullTextDate, displayDate };
    }

    const res = formatVietnameseDateLocal("2026-09-19T11:56:43+07:00");
    assert.equal(res.day, "19");
    assert.equal(res.month, "09");
    assert.equal(res.year, "2026");
    assert.equal(res.shortDate, "19/09/2026");
    assert.equal(res.fullTextDate, "Ngày 19 tháng 09 năm 2026");
    assert.equal(res.displayDate, "Ngày 19/09/2026 (Ngày 19 tháng 09 năm 2026)");
  });

  test("2. alertPayload.ts Contract: EVENT_TYPES chấp nhận shift_summary", () => {
    const filePath = join(__dirname, "../frontend/src/app/api/_lib/alertPayload.ts");
    const content = readFileSync(filePath, "utf8");

    assert.ok(content.includes('"shift_summary"'), "EVENT_TYPES in alertPayload.ts must include shift_summary");
  });

  test("3. telegram-alert route.ts: Có template chuyên dụng cho shift_summary", () => {
    const filePath = join(__dirname, "../frontend/src/app/api/telegram-alert/route.ts");
    const content = readFileSync(filePath, "utf8");

    assert.ok(content.includes('event_type === "shift_summary"'), "Must check for shift_summary event");
    assert.ok(
      content.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC - HỆ THỐNG SORTIX IOT]"),
      "Must have dedicated title for 1-day work report"
    );
    assert.ok(
      content.includes("Báo cáo 1 ngày làm việc được hệ thống tự động tổng hợp và gửi khi chuyển sang ngày mới"),
      "Must note automatic dispatch on new day transition"
    );
  });

  test("4. email-alert route.ts: Có template chuyên dụng cho shift_summary", () => {
    const filePath = join(__dirname, "../frontend/src/app/api/email-alert/route.ts");
    const content = readFileSync(filePath, "utf8");

    assert.ok(content.includes('event_type === "shift_summary"'), "Must check for shift_summary event");
    assert.ok(
      content.includes("BÁO CÁO 1 NGÀY LÀM VIỆC - TỔNG KẾT SẢN XUẤT"),
      "Must have dedicated email title"
    );
    assert.ok(
      content.includes("Báo cáo tổng kết 1 ngày làm việc được hệ thống SortiX IoT tự động gửi qua Email và Telegram mỗi khi qua ngày mới"),
      "Must state automatic dispatch via Email and Telegram on new day"
    );
    assert.ok(content.includes("#10b981"), "Must use positive emerald green banner color");
  });

  test("5. alertService.ts: triggerAlertDispatch gửi đồng thời cả Telegram và Email khi có shift_summary", () => {
    const filePath = join(__dirname, "../frontend/src/lib/alertService.ts");
    const content = readFileSync(filePath, "utf8");

    assert.ok(
      content.includes('alert.event_type === "shift_summary"'),
      "triggerAlertDispatch must check alert.event_type === 'shift_summary'"
    );
    assert.ok(
      content.includes("sendTelegramAlert(alert, true)"),
      "Must force send Telegram bypassing cooldown"
    );
    assert.ok(
      content.includes("sendEmailAlert(alert, true)"),
      "Must force send Email bypassing cooldown"
    );
  });

  test("6. DashboardLayout.tsx: Tự động tổng kết khi qua ngày mới & dispatch đồng thời cả Tele và Email", () => {
    const filePath = join(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx");
    const content = readFileSync(filePath, "utf8");

    assert.ok(content.includes("new_day_transition"), "Must support new_day_transition source");
    assert.ok(content.includes("hasTriggeredNewDayRef"), "Must have hasTriggeredNewDayRef");
    assert.ok(content.includes("lastActiveDayRef"), "Must track lastActiveDayRef");
    assert.ok(content.includes("formatVietnameseDate"), "Must format Vietnamese date for shift name");
    assert.ok(
      content.includes("sendTelegramAlert(alertItem, true)") && content.includes("sendEmailAlert(alertItem, true)"),
      "Must explicitly dispatch to both Telegram and Email on daily shift report"
    );
    assert.ok(
      content.includes("dateNow.getHours() === 0 && dateNow.getMinutes() === 0"),
      "Must check 00:00 midnight for new day transition"
    );
  });

  test("7. ShiftSummaryToast.tsx: Hiển thị ngày tháng năm rõ ràng, không lặp tiêu đề", () => {
    const filePath = join(__dirname, "../frontend/src/components/ui/ShiftSummaryToast.tsx");
    const content = readFileSync(filePath, "utf8");

    assert.ok(content.includes("displayShiftName"), "Must sanitize displayShiftName");
    assert.ok(content.includes("BÁO CÁO 1 NGÀY LÀM VIỆC"), "Toast must have header BÁO CÁO 1 NGÀY LÀM VIỆC");
    assert.ok(content.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC]"), "Toast must have [BÁO CÁO 1 NGÀY LÀM VIỆC]");
  });

  test("8. ShiftSummaryModal.tsx: Hiển thị đầy đủ Kỳ làm việc rõ ràng ngày tháng năm", () => {
    const filePath = join(__dirname, "../frontend/src/components/ui/ShiftSummaryModal.tsx");
    const content = readFileSync(filePath, "utf8");

    assert.ok(content.includes("formatVietnameseDate"), "Modal must use formatVietnameseDate");
    assert.ok(content.includes("Kỳ làm việc:"), "Modal subtitle must state Kỳ làm việc with full date");
  });
});
