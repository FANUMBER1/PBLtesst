const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

describe("Mute Siren Feature (Tắt còi khi kiểm tra sự cố)", () => {
  it("1. EmergencyUnlockToast contains mute/silence siren button & toggle handler", () => {
    const toastPath = path.resolve(__dirname, "../frontend/src/components/ui/EmergencyUnlockToast.tsx");
    const content = fs.readFileSync(toastPath, "utf8");

    assert.ok(content.includes("isSirenSilenced"), "Should maintain isSirenSilenced state");
    assert.ok(content.includes("handleToggleSiren"), "Should provide handleToggleSiren");
    assert.ok(content.includes("stopContinuousEmergencyAlarm"), "Should call stopContinuousEmergencyAlarm");
    assert.ok(content.includes("startContinuousEmergencyAlarm"), "Should call startContinuousEmergencyAlarm");
    assert.ok(content.includes("Tắt còi"), "Should render Vietnamese text 'Tắt còi'");
    assert.ok(content.includes("Bật còi"), "Should render Vietnamese text 'Bật còi'");
  });

  it("2. EmergencyStopBanner contains mute/silence siren button", () => {
    const bannerPath = path.resolve(__dirname, "../frontend/src/components/layout/EmergencyStopBanner.tsx");
    const content = fs.readFileSync(bannerPath, "utf8");

    assert.ok(content.includes("isSirenSilenced"), "Should maintain isSirenSilenced state in banner");
    assert.ok(content.includes("handleToggleSiren"), "Should provide handleToggleSiren in banner");
    assert.ok(content.includes("Tắt còi"), "Should render 'Tắt còi' in banner");
  });

  it("3. EmergencyConfirmModal contains interactive mute toggle", () => {
    const modalPath = path.resolve(__dirname, "../frontend/src/components/ui/EmergencyConfirmModal.tsx");
    const content = fs.readFileSync(modalPath, "utf8");

    assert.ok(content.includes("isSirenSilenced"), "Should maintain isSirenSilenced state in modal");
    assert.ok(content.includes("handleToggleSiren"), "Should provide handleToggleSiren in modal");
    assert.ok(content.includes("Tắt còi"), "Should render 'Tắt còi' in modal");
  });

  it("4. JamUnlockToast contains mute siren button for jam events", () => {
    const jamPath = path.resolve(__dirname, "../frontend/src/components/ui/JamUnlockToast.tsx");
    const content = fs.readFileSync(jamPath, "utf8");

    assert.ok(content.includes("isSirenSilenced"), "Should maintain isSirenSilenced state in jam toast");
    assert.ok(content.includes("handleToggleSiren"), "Should provide handleToggleSiren in jam toast");
    assert.ok(content.includes("stopContinuousJamAlarm"), "Should call stopContinuousJamAlarm");
    assert.ok(content.includes("Tắt còi"), "Should render 'Tắt còi' in jam toast");
  });
});
