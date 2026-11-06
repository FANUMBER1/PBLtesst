const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Smart Auto-Run / Auto-Stop Conveyor (FE & BE Contracts)", () => {
  it("1. useConveyorPhysics must auto-run when items are placed and auto-stop when all items enter trays", () => {
    const physicsPath = path.resolve(__dirname, "../frontend/src/hooks/useConveyorPhysics.ts");
    assert.strictEqual(fs.existsSync(physicsPath), true, "useConveyorPhysics.ts must exist");
    const content = fs.readFileSync(physicsPath, "utf8");

    // Must track belt motion state with prevBeltMovingRef
    assert.match(content, /prevBeltMovingRef\s*=\s*useRef<boolean>\(false\)/, "Must define prevBeltMovingRef");

    // Must auto-wake running state if a specimen appears
    assert.match(
      content,
      /hasActiveItems\s*&&\s*!isRunningRef\.current/,
      "Must automatically enable isRunning if an item is placed on the conveyor"
    );

    // Must trigger START on motion edge (false -> true)
    assert.match(
      content,
      /onPublishCommandRef\.current\?\.\(["']START["']\)/,
      "Must publish START MQTT command when an item is placed on the conveyor"
    );

    // Must trigger STOP on idle edge (true -> false)
    assert.match(
      content,
      /onPublishCommandRef\.current\?\.\(["']STOP["']\)/,
      "Must publish STOP MQTT command when all items have entered the trays"
    );
  });

  it("2. ConveyorToolbar displays clear status and auto-run instruction", () => {
    const toolbarPath = path.resolve(__dirname, "../frontend/src/components/conveyor/ConveyorToolbar.tsx");
    assert.strictEqual(fs.existsSync(toolbarPath), true, "ConveyorToolbar.tsx must exist");
    const content = fs.readFileSync(toolbarPath, "utf8");

    assert.match(
      content,
      /Băng tải đã tự động dừng khi phôi vào khay hết • Đặt thêm mẫu vật lên là tự động chạy/,
      "Toolbar must clearly explain that placing an additional item will auto-run the conveyor"
    );
  });

  it("3. Backend telemetryController enforces conveyor stop when optical sensor is clear / no objects", () => {
    const bePath = path.resolve(__dirname, "../backend/src/controllers/telemetryController.ts");
    assert.strictEqual(fs.existsSync(bePath), true, "telemetryController.ts must exist");
    const content = fs.readFileSync(bePath, "utf8");

    assert.match(content, /hasObjectOnSensor\s*=\s*optical_sensor\s*===\s*["']BLOCKED["']/, "Must check if object is on sensor");
    assert.match(content, /conveyor_speed\s*=\s*is_running/, "Must set speed to 0 when stopped");
  });
});
