const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Cross-Device Real-Time Synchronization (PC Web <-> iPhone Safari <-> Android App)", () => {
  it("1. Backend SyncService: manages state, updates mode, running, speed, bin counts, and broadcasts state_sync via SSE", () => {
    const syncServicePath = path.resolve(__dirname, "../backend/src/services/syncService.ts");
    assert.strictEqual(fs.existsSync(syncServicePath), true, "syncService.ts must exist in backend");

    const content = fs.readFileSync(syncServicePath, "utf8");
    assert.match(content, /export const SyncService/, "SyncService must be exported");
    assert.match(content, /getState\(\)/, "SyncService must have getState()");
    assert.match(content, /updateState\(/, "SyncService must have updateState()");
    assert.match(content, /syncRecords\(/, "SyncService must have syncRecords()");
    assert.match(content, /clearHistory\(/, "SyncService must have clearHistory()");
    assert.match(content, /spawnItem\(/, "SyncService must have spawnItem()");
    assert.match(content, /SSEService\.broadcast\("state_sync"/, "Must broadcast state_sync via SSE");
    assert.match(content, /SSEService\.broadcast\("history_sync"/, "Must broadcast history_sync via SSE");
    assert.match(content, /SSEService\.broadcast\("history_cleared"/, "Must broadcast history_cleared via SSE");
    assert.match(content, /SSEService\.broadcast\("spawn_item"/, "Must broadcast spawn_item via SSE");
  });

  it("2. Next.js API Route /api/sync: provides GET and POST endpoints for client hydration & mutations", () => {
    const routePath = path.resolve(__dirname, "../frontend/src/app/api/sync/route.ts");
    assert.strictEqual(fs.existsSync(routePath), true, "route.ts must exist in /api/sync");

    const content = fs.readFileSync(routePath, "utf8");
    assert.match(content, /export async function GET/, "Must provide GET handler for initial hydration");
    assert.match(content, /export async function POST/, "Must provide POST handler for mutations");
    assert.match(content, /type === "update_state"/, "Must handle update_state");
    assert.match(content, /type === "sync_records"/, "Must handle sync_records");
    assert.match(content, /type === "clear_history"/, "Must handle clear_history");
    assert.match(content, /type === "spawn_item"/, "Must handle spawn_item");
  });

  it("3. Frontend apiSyncClient: exports myClientId, fetchSyncData, updateSyncState, syncRecordsToServer, syncClearHistoryToServer, syncSpawnItemToServer", () => {
    const clientPath = path.resolve(__dirname, "../frontend/src/services/apiSyncClient.ts");
    assert.strictEqual(fs.existsSync(clientPath), true, "apiSyncClient.ts must exist");

    const content = fs.readFileSync(clientPath, "utf8");
    assert.match(content, /export const myClientId/, "Must export myClientId for loop prevention");
    assert.match(content, /export async function fetchSyncData/, "Must export fetchSyncData");
    assert.match(content, /export async function updateSyncState/, "Must export updateSyncState");
    assert.match(content, /export async function syncRecordsToServer/, "Must export syncRecordsToServer");
    assert.match(content, /export async function syncClearHistoryToServer/, "Must export syncClearHistoryToServer");
    assert.match(content, /export async function syncSpawnItemToServer/, "Must export syncSpawnItemToServer");
  });

  it("4. useSorterData Hook Contract: loads sync on mount and provides applyIncoming sync handlers", () => {
    const sorterPath = path.resolve(__dirname, "../frontend/src/hooks/useSorterData.ts");
    const content = fs.readFileSync(sorterPath, "utf8");

    assert.match(content, /fetchSyncData/, "Must call fetchSyncData on mount");
    assert.match(content, /applyIncomingSyncState/, "Must export applyIncomingSyncState");
    assert.match(content, /applyIncomingSyncRecords/, "Must export applyIncomingSyncRecords");
    assert.match(content, /applyIncomingClearHistory/, "Must export applyIncomingClearHistory");
    assert.match(content, /syncRecordsToServer/, "Must call syncRecordsToServer on sort and demo creation");
    assert.match(content, /syncClearHistoryToServer/, "Must call syncClearHistoryToServer on clear");
    assert.match(content, /updateSyncState/, "Must call updateSyncState on mode, bin and capacity changes");
  });

  it("5. useConveyorPhysics Hook Contract: synchronizes running state, speed, and spawned visual items", () => {
    const physicsPath = path.resolve(__dirname, "../frontend/src/hooks/useConveyorPhysics.ts");
    const content = fs.readFileSync(physicsPath, "utf8");

    assert.match(content, /syncSpawnItemToServer\(newItem\)/, "Must broadcast spawned visual packages");
    assert.match(content, /updateSyncState\(\{\s*isRunning:\s*nextState\s*\}\)/, "Must broadcast conveyor running state");
    assert.match(content, /updateSyncState\(\{\s*speed:\s*newSpeed\s*\}\)/, "Must broadcast conveyor speed");
  });

  it("6. DashboardLayout Contract: listens to SSE channels and updates state from other devices without echo", () => {
    const layoutPath = path.resolve(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx");
    const content = fs.readFileSync(layoutPath, "utf8");

    assert.match(content, /eventSource\.addEventListener\("state_sync"/, "Must listen to state_sync");
    assert.match(content, /eventSource\.addEventListener\("history_sync"/, "Must listen to history_sync");
    assert.match(content, /eventSource\.addEventListener\("history_cleared"/, "Must listen to history_cleared");
    assert.match(content, /eventSource\.addEventListener\("spawn_item"/, "Must listen to spawn_item");
    assert.match(content, /data\?\.senderId !== myClientId/, "Must filter out events from own client to prevent feedback loops");
  });

  it("7. Mobile & LAN Network Configuration: Capacitor connects to central server IP and Next.js binds to 0.0.0.0", () => {
    const capPath = path.resolve(__dirname, "../frontend/capacitor.config.ts");
    const capContent = fs.readFileSync(capPath, "utf8");
    assert.match(capContent, /url:\s*process\.env\.CAPACITOR_SERVER_URL\s*\|\|\s*('http:\/\/192\.168\.1\.4:3000'|'https:\/\/sorti-x-dashboard\.vercel\.app')/, "Capacitor config must point to central server IP or production URL");

    const pkgPath = path.resolve(__dirname, "../frontend/package.json");
    const pkgContent = fs.readFileSync(pkgPath, "utf8");
    assert.match(pkgContent, /-H 0\.0\.0\.0 -p 3000/, "Next.js dev script must bind to 0.0.0.0:3000");
  });
});
