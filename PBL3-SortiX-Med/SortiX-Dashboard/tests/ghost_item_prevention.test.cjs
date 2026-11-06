const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Fix Ghost Item on Conveyor Belt (Hết mẫu vật nhưng băng tải hiện 1 vật)", () => {
  it("1. useConveyorPhysics: excludes deflected and sorted items from hasActiveItems and animates deflection outside isBeltMoving", () => {
    const physicsPath = path.resolve(__dirname, "../frontend/src/hooks/useConveyorPhysics.ts");
    assert.strictEqual(fs.existsSync(physicsPath), true, "useConveyorPhysics.ts must exist");
    const content = fs.readFileSync(physicsPath, "utf8");

    // hasActiveItems excludes sorted/deflected items
    assert.match(
      content,
      /hasActiveItems\s*=\s*visualItemsRef\.current\.some\(\s*\(\w+\)\s*=>\s*!\w+\.sorted\s*&&\s*!\w+\.deflected\s*&&\s*\(\w+\.progress\s*\?\?\s*0\)\s*<\s*96\s*\)/,
      "useConveyorPhysics must not consider sorted or deflected items as active items"
    );

    // Deflected items must be processed regardless of isBeltMoving
    assert.match(
      content,
      /if\s*\(\s*item\.deflected\s*\|\|\s*item\.sorted\s*\)\s*\{/,
      "useConveyorPhysics must process falling items every frame outside belt movement"
    );

    // Immediate cleanup on empty
    assert.match(
      content,
      /isNowEmpty/,
      "useConveyorPhysics must immediately sync state when visualItems becomes empty"
    );
  });

  it("2. ConveyorVisualizer: uses activeItemsCount to display correct count and hides ghost items", () => {
    const visualizerPath = path.resolve(__dirname, "../frontend/src/components/ConveyorVisualizer.tsx");
    assert.strictEqual(fs.existsSync(visualizerPath), true, "ConveyorVisualizer.tsx must exist");
    const content = fs.readFileSync(visualizerPath, "utf8");

    // hasActiveItems and activeItemsCount
    assert.match(
      content,
      /hasActiveItems\s*=\s*items\.some/,
      "ConveyorVisualizer must compute hasActiveItems from items prop"
    );
    assert.match(
      content,
      /activeItemsCount\s*=\s*items\.filter/,
      "ConveyorVisualizer must compute activeItemsCount excluding sorted items"
    );

    // Toolbar receives activeItemsCount
    assert.match(
      content,
      /itemsCount=\{activeItemsCount\}/,
      "ConveyorToolbar must receive activeItemsCount instead of total items length"
    );

    // Status banner uses activeItemsCount
    assert.match(
      content,
      /Đang vận chuyển \{activeItemsCount\} phôi mẫu qua các trạm phân loại/,
      "Status banner must only count active items being transported"
    );
  });

  it("3. VisualItemRenderer: hides item.id HUD badge once item is deflected or sorted", () => {
    const rendererPath = path.resolve(__dirname, "../frontend/src/components/conveyor/VisualItemRenderer.tsx");
    assert.strictEqual(fs.existsSync(rendererPath), true, "VisualItemRenderer.tsx must exist");
    const content = fs.readFileSync(rendererPath, "utf8");

    assert.match(
      content,
      /!item\.deflected\s*&&\s*!item\.sorted\s*&&\s*\(\s*<span[\s\S]*?\{item\.id\}/,
      "VisualItemRenderer must not display floating ID badge on sorted or deflected items"
    );
  });

  it("4. DashboardLayout: hasItems matches active items contract to prevent false conveyor_running", () => {
    const layoutPath = path.resolve(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx");
    assert.strictEqual(fs.existsSync(layoutPath), true, "DashboardLayout.tsx must exist");
    const content = fs.readFileSync(layoutPath, "utf8");

    assert.match(
      content,
      /hasItems\s*=\s*conveyor\.visualItemsRef\.current\.some\(\s*\(\w+\)\s*=>\s*!\w+\.sorted\s*&&\s*!\w+\.deflected\s*&&\s*\(\w+\.progress\s*\?\?\s*0\)\s*<\s*96\s*\)/,
      "DashboardLayout must not trigger conveyor_running if items are already in trays"
    );
  });
});
