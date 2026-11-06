"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ClassificationRecord,
  AlertEvent,
  ThroughputPoint,
  VisualItem,
  VisionDetection,
  SorterConfig,
  CATALOG_BRANDS,
} from "@/lib/types";
import { getBrandName, determineTargetBin } from "@/lib/dataProcessor";
import {
  BinCounts,
  BinCapacities,
  loadClassificationHistory,
  saveClassificationRecord,
  saveClassificationRecordsLocal,
  clearClassificationHistory,
  loadBinCountsLocal,
  loadBinCapacitiesLocal,
  updateBinCountsLocal,
  loadBrandCountsLocal,
  loadOperatingMode,
  saveOperatingMode,
  saveBinCountsLocal,
  saveBinCapacitiesLocal,
  loadAlertHistory,
  clearAlertHistory,
} from "@/lib/history";
import { industrialAudio } from "@/lib/audioService";
import { triggerAlertDispatch } from "@/lib/alertService";
import { useToast } from "@/components/ui/Toast";
import {
  fetchSyncData,
  updateSyncState,
  syncRecordsToServer,
  syncClearHistoryToServer,
} from "@/services/apiSyncClient";
import type { DashboardSyncState } from "@/services/syncService";

export interface UseSorterDataProps {
  configRef: React.MutableRefObject<SorterConfig>;
  onIncomingConfig?: (config: SorterConfig) => void;
  onSpawnRealVisualItem?: (item: VisualItem) => void;
  onPublishCommand?: (cmd: string, value?: number) => void;
  onBinFullTrigger?: (binIndex: 1 | 2 | 3, count: number, maxCapacity?: number) => void;
}

export function useSorterData({ configRef, onSpawnRealVisualItem, onPublishCommand, onBinFullTrigger }: UseSorterDataProps) {
  const [isClient, setIsClient] = useState(false);
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const { success: showToastSuccess } = useToast();
  const onBinFullTriggerRef = useRef(onBinFullTrigger);
  onBinFullTriggerRef.current = onBinFullTrigger;

  // Simulation mode states
  const [simRecords, setSimRecords] = useState<ClassificationRecord[]>([]);
  const [simBinCounts, setSimBinCounts] = useState<BinCounts>({ bin1: 0, bin2: 0, bin3: 0 });
  const [simBinCapacities, setSimBinCapacities] = useState<BinCapacities>({ bin1: 50, bin2: 50, bin3: 50 });
  const [simBrandCounts, setSimBrandCounts] = useState<Record<string, number>>({
    brand_c: 0,
    brand_a: 0,
    brand_b: 0,
    brand_d: 0,
  });
  const [simThroughput, setSimThroughput] = useState<ThroughputPoint[]>([]);

  // Real hardware mode states
  const [realRecords, setRealRecords] = useState<ClassificationRecord[]>([]);
  const [realBinCounts, setRealBinCounts] = useState<BinCounts>({ bin1: 0, bin2: 0, bin3: 0 });
  const [realBinCapacities, setRealBinCapacities] = useState<BinCapacities>({ bin1: 50, bin2: 50, bin3: 50 });
  const [realBrandCounts, setRealBrandCounts] = useState<Record<string, number>>({
    brand_c: 0,
    brand_a: 0,
    brand_b: 0,
    brand_d: 0,
  });
  const [realThroughput, setRealThroughput] = useState<ThroughputPoint[]>([]);

  // Alerts
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  // Refs for physics & interval callbacks
  const isSimulationRef = useRef<boolean>(isSimulation);
  isSimulationRef.current = isSimulation;
  const simRecordsRef = useRef<ClassificationRecord[]>(simRecords);
  simRecordsRef.current = simRecords;
  const realRecordsRef = useRef<ClassificationRecord[]>(realRecords);
  realRecordsRef.current = realRecords;
  const simBinCountsRef = useRef<BinCounts>(simBinCounts);
  simBinCountsRef.current = simBinCounts;
  const realBinCountsRef = useRef<BinCounts>(realBinCounts);
  realBinCountsRef.current = realBinCounts;
  const simBinCapacitiesRef = useRef<BinCapacities>(simBinCapacities);
  simBinCapacitiesRef.current = simBinCapacities;
  const realBinCapacitiesRef = useRef<BinCapacities>(realBinCapacities);
  realBinCapacitiesRef.current = realBinCapacities;

  const recentSortTimesSimRef = useRef<number[]>([]);
  const recentSortTimesRealRef = useRef<number[]>([]);

  // Load initial data from localStorage
  useEffect(() => {
    setIsClient(true);
    const savedMode = loadOperatingMode();
    setIsSimulation(savedMode);

    // 1. Sim Data
    const loadedSimRecords = loadClassificationHistory(true);
    const loadedSimCounts = loadBinCountsLocal(true);
    const loadedSimCapacities = loadBinCapacitiesLocal(true);
    const loadedSimBrands = loadBrandCountsLocal(true);
    setSimRecords(loadedSimRecords);
    setSimBinCounts(loadedSimCounts);
    setSimBinCapacities(loadedSimCapacities);
    setSimBrandCounts(loadedSimBrands);

    // 2. Real Data
    const loadedRealRecords = loadClassificationHistory(false);
    const loadedRealCounts = loadBinCountsLocal(false);
    const loadedRealCapacities = loadBinCapacitiesLocal(false);
    const loadedRealBrands = loadBrandCountsLocal(false);
    setRealRecords(loadedRealRecords);
    setRealBinCounts(loadedRealCounts);
    setRealBinCapacities(loadedRealCapacities);
    setRealBrandCounts(loadedRealBrands);

    // 3. Alerts
    const loadedAlerts = loadAlertHistory();
    setAlerts(loadedAlerts);

    // 4. Initial Throughput points
    const createInitialPoints = (total: number, counts: BinCounts): ThroughputPoint[] =>
      Array.from({ length: 12 }, (_, i) => ({
        time: new Date(Date.now() - (12 - i) * 3000).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        ppm: 0,
        total,
        bin1: counts.bin1,
        bin2: counts.bin2,
        bin3: counts.bin3,
        speed: 0,
      }));

    setSimThroughput(createInitialPoints(loadedSimRecords.length, loadedSimCounts));
    setRealThroughput(createInitialPoints(loadedRealRecords.length, loadedRealCounts));

    // Cross-Device Server Sync on mount
    fetchSyncData().then((syncRes) => {
      if (!syncRes.success) return;
      const s = syncRes.state;
      if (s) {
        if (s.mode) {
          setIsSimulation(s.mode === "sim");
          saveOperatingMode(s.mode === "sim");
        }
        if (s.binCounts) {
          if (s.mode === "sim") {
            setSimBinCounts(s.binCounts);
            simBinCountsRef.current = s.binCounts;
            saveBinCountsLocal(s.binCounts, true);
          } else {
            setRealBinCounts(s.binCounts);
            realBinCountsRef.current = s.binCounts;
            saveBinCountsLocal(s.binCounts, false);
          }
        }
        if (s.binCapacities) {
          if (s.mode === "sim") {
            setSimBinCapacities(s.binCapacities);
            simBinCapacitiesRef.current = s.binCapacities;
            saveBinCapacitiesLocal(s.binCapacities, true);
          } else {
            setRealBinCapacities(s.binCapacities);
            realBinCapacitiesRef.current = s.binCapacities;
            saveBinCapacitiesLocal(s.binCapacities, false);
          }
        }
      }
      if (syncRes.history && syncRes.history.length > 0) {
        setSimRecords(syncRes.history);
        simRecordsRef.current = syncRes.history;
        saveClassificationRecordsLocal(syncRes.history, true);
      } else if (loadedSimRecords.length > 0) {
        void syncRecordsToServer(loadedSimRecords, loadedSimCounts);
      }
    });
  }, []);

  // Toggle Mode Handler
  const toggleSimulationMode = useCallback((targetMode?: boolean) => {
    industrialAudio.playClick();
    setIsSimulation((prev) => {
      const next = typeof targetMode === "boolean" ? targetMode : !prev;
      saveOperatingMode(next);
      void updateSyncState({ mode: next ? "sim" : "real" });
      return next;
    });
  }, []);

  // Tạo một bộ dữ liệu demo ngẫu nhiên khi người dùng chủ động yêu cầu.
  // Không gọi hàm này trong lúc khởi tạo để chế độ mô phỏng mặc định luôn rỗng.
  const generateSimulationDemoData = useCallback(() => {
    if (!isClient || !isSimulationRef.current) return;

    const brands = Object.keys(CATALOG_BRANDS);
    const count = 18 + Math.floor(Math.random() * 13);
    const now = Date.now();
    const generated: ClassificationRecord[] = Array.from({ length: count }, (_, index) => {
      const brandKey = brands[Math.floor(Math.random() * brands.length)];
      const targetBin = determineTargetBin(brandKey, configRef.current);
      const timestamp = new Date(now - Math.floor(Math.random() * 72 * 60 * 60 * 1000));
      const brand = CATALOG_BRANDS[brandKey];

      return {
        id: `demo_${now}_${index}_${Math.random().toString(16).slice(2, 6)}`,
        product_id: `#DEMO-${index + 1}`,
        brand_id: brandKey,
        brand_name: brand.name,
        confidence: Number((0.9 + Math.random() * 0.09).toFixed(2)),
        target_bin: targetBin,
        actual_bin: targetBin,
        status: "success",
        timestamp: timestamp.toISOString(),
      };
    });

    const updatedRecords = saveClassificationRecordsLocal(generated, true);
    const addedCounts = generated.reduce<BinCounts>(
      (counts, record) => {
        const key = `bin${record.actual_bin}` as keyof BinCounts;
        counts[key] += 1;
        return counts;
      },
      { bin1: 0, bin2: 0, bin3: 0 }
    );
    const nextCounts: BinCounts = {
      bin1: Math.min(simBinCountsRef.current.bin1 + addedCounts.bin1, 50),
      bin2: Math.min(simBinCountsRef.current.bin2 + addedCounts.bin2, 50),
      bin3: Math.min(simBinCountsRef.current.bin3 + addedCounts.bin3, 50),
    };

    saveBinCountsLocal(nextCounts, true);
    setSimRecords(updatedRecords);
    setSimBinCounts(nextCounts);
    void syncRecordsToServer(generated, nextCounts);
    setSimBrandCounts((previous) => {
      const next = { ...previous };
      generated.forEach((record) => {
        next[record.brand_id] = (next[record.brand_id] || 0) + 1;
      });
      return next;
    });
    setSimThroughput((previous) => [
      ...previous.slice(1),
      {
        time: new Date().toLocaleTimeString("vi-VN", { hour12: false }),
        ppm: 0,
        total: updatedRecords.length,
        bin1: nextCounts.bin1,
        bin2: nextCounts.bin2,
        bin3: nextCounts.bin3,
        speed: 0,
      },
    ]);
    showToastSuccess(`Đã tạo ${generated.length} bản ghi demo ngẫu nhiên.`);
  }, [configRef, isClient, isSimulationRef, showToastSuccess, simBinCountsRef]);

  // Record Real Detection from MQTT Vision Camera (YOLOv8)
  const handleRealHardwareDetection = useCallback(
    (detection: VisionDetection) => {
      const targetBin = determineTargetBin(detection.brand_id, configRef.current, detection.confidence);
      
      // Direct visualization on belt if in Real Mode
      if (!isSimulationRef.current && onSpawnRealVisualItem) {
        const newItem: VisualItem = {
          id: detection.product_id,
          brandKey: detection.brand_id,
          progress: 0,
          targetBin: targetBin,
          yOffset: 0,
          opacity: 1,
          deflected: false,
          sorted: false,
          s1Triggered: true, // We assume it's detected at S1
          isSim: false,
          confidence: detection.confidence,
          timestamp: detection.timestamp || new Date().toISOString(),
        };
        onSpawnRealVisualItem(newItem);
      }
    },
    [configRef, onSpawnRealVisualItem]
  );

  // Record sorted item from conveyor physics loop
  const handleItemSorted = useCallback((item: VisualItem, actualBin: number) => {
    if (!isSimulationRef.current || !item.isSim) return;
    const isSim = item.isSim;
    const isCorrect = item.targetBin === actualBin;
    const brand = CATALOG_BRANDS[item.brandKey];
    
    // Use stored confidence and timestamp if from real hardware, else simulate
    const confidence = item.confidence ?? (0.94 + Math.random() * 0.05);
    const timestamp = item.timestamp ?? new Date().toISOString();
    
    const record: ClassificationRecord = {
      id: `${isSim ? "sim" : "real"}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      product_id: item.id,
      brand_id: item.brandKey,
      brand_name: brand?.name || getBrandName(item.brandKey),
      confidence: confidence,
      target_bin: item.targetBin,
      actual_bin: actualBin,
      status: isCorrect ? "success" : "diverted_default",
      timestamp: timestamp,
    };

    const currentCount = isSim
      ? simBinCountsRef.current[`bin${actualBin}` as keyof BinCounts] || 0
      : realBinCountsRef.current[`bin${actualBin}` as keyof BinCounts] || 0;

    const capacities = isSim ? simBinCapacitiesRef.current : realBinCapacitiesRef.current;
    const targetCapacity = capacities[`bin${actualBin}` as keyof BinCapacities] || 50;

    const newCount = currentCount + 1;

    if (newCount >= targetCapacity) {
      const binIdStr = actualBin === 1 ? "BIN_RED_01" : actualBin === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03";
      const binName = actualBin === 1 ? "Đỏ (#01)" : actualBin === 2 ? "Xanh (#02)" : "Mặc định (#03)";
      const alert: AlertEvent = {
        event_id: `bin_full_${actualBin}_${Date.now()}`,
        event_type: "bin_full",
        severity: "warning",
        device_id: binIdStr,
        description: `[ĐẦY KHAY CHỨA] Khay phân loại sản phẩm ${binName} đã đạt giới hạn ${newCount}/${targetCapacity} cái. Vui lòng thay thế khay rỗng mới`,
        timestamp: new Date().toISOString(),
        resolved: false,
        mode: isSim ? "simulation" : "realtime",
      };
      setAlerts((prev) => [alert, ...prev.filter((a) => a.event_id !== alert.event_id)].slice(0, 100));
      triggerAlertDispatch(alert);
      onBinFullTriggerRef.current?.(actualBin as 1 | 2 | 3, newCount, targetCapacity);
    }

    if (isSim) {
      recentSortTimesSimRef.current.push(Date.now());
      saveClassificationRecord(record, true);
      updateBinCountsLocal(actualBin, true);
      setSimRecords((prev) => [record, ...prev].slice(0, 500));
      const binKey = `bin${actualBin}` as "bin1" | "bin2" | "bin3";
      const nextCount = Math.min((simBinCountsRef.current[binKey] || 0) + 1, targetCapacity);
      const nextSimCounts: BinCounts = { ...simBinCountsRef.current, [binKey]: nextCount };
      simBinCountsRef.current = nextSimCounts;
      setSimBinCounts(nextSimCounts);
      setSimBrandCounts((prev) => ({
        ...prev,
        [item.brandKey]: (prev[item.brandKey] || 0) + 1,
      }));
      void syncRecordsToServer([record], nextSimCounts);
    } else {
      recentSortTimesRealRef.current.push(Date.now());
      saveClassificationRecord(record, false);
      updateBinCountsLocal(actualBin, false);
      setRealRecords((prev) => [record, ...prev].slice(0, 500));
      const binKey = `bin${actualBin}` as "bin1" | "bin2" | "bin3";
      const nextCount = Math.min((realBinCountsRef.current[binKey] || 0) + 1, targetCapacity);
      const nextRealCounts: BinCounts = { ...realBinCountsRef.current, [binKey]: nextCount };
      realBinCountsRef.current = nextRealCounts;
      setRealBinCounts(nextRealCounts);
      setRealBrandCounts((prev) => ({
        ...prev,
        [item.brandKey]: (prev[item.brandKey] || 0) + 1,
      }));
      void syncRecordsToServer([record], nextRealCounts);
    }

    industrialAudio.playSortSuccess();
  }, []);

  // Persist MQTT classification outcomes; only verified physical bin feedback
  // may update real occupancy and bin-full counts.
  const handleHardwareClassification = useCallback((record: ClassificationRecord) => {
    if (isSimulationRef.current) return;
    if (realRecordsRef.current.some((existing) => existing.id === record.id ||
      (existing.product_id === record.product_id && existing.timestamp === record.timestamp))) return;
    const nextRecords = [record, ...realRecordsRef.current].slice(0, 500);
    realRecordsRef.current = nextRecords;
    setRealRecords(nextRecords);
    saveClassificationRecord(record, false);
    recentSortTimesRealRef.current.push(Date.now());
    // routed_bin is a command/route metric; only verified actual_bin feedback
    // may change occupancy and bin-full calculations.
    if ((record.status === "success" || record.status === "diverted_default")
      && (record.actual_bin === 1 || record.actual_bin === 2 || record.actual_bin === 3)) {
      const key = `bin${record.actual_bin}` as keyof BinCounts;
      const nextCounts = { ...realBinCountsRef.current, [key]: realBinCountsRef.current[key] + 1 };
      realBinCountsRef.current = nextCounts;
      setRealBinCounts(nextCounts);
      saveBinCountsLocal(nextCounts, false);
      void syncRecordsToServer([record], nextCounts);
    } else {
      void syncRecordsToServer([record], realBinCountsRef.current);
    }
    setRealBrandCounts((prev) => ({ ...prev, [record.brand_id]: (prev[record.brand_id] || 0) + 1 }));
  }, []);

  const handleHardwareBinCounts = useCallback((payload: unknown) => {
    if (isSimulationRef.current || !payload || typeof payload !== "object") return;
    const payloadData = payload as Record<string, unknown>;
    const counts = payloadData.bin_counts;
    const data = counts && typeof counts === "object"
      ? counts as Record<string, unknown>
      : payloadData;
    if (![data.bin1, data.bin2, data.bin3].every((value) =>
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0)) return;
    const next = { bin1: data.bin1 as number, bin2: data.bin2 as number, bin3: data.bin3 as number };
    realBinCountsRef.current = next;
    setRealBinCounts(next);
    saveBinCountsLocal(next, false);
  }, []);

  // Clear history action
  const executeClearHistory = useCallback(() => {
    industrialAudio.playClick();
    clearClassificationHistory(isSimulationRef.current);
    void syncClearHistoryToServer();

    if (isSimulationRef.current) {
      setSimRecords([]);
      setSimBinCounts({ bin1: 0, bin2: 0, bin3: 0 });
      setSimBrandCounts({ brand_c: 0, brand_a: 0, brand_b: 0, brand_d: 0 });
      recentSortTimesSimRef.current = [];
      if (typeof window !== "undefined") {
        localStorage.removeItem("pbl3_product_seq");
      }
    } else {
      setRealRecords([]);
      setRealBinCounts({ bin1: 0, bin2: 0, bin3: 0 });
      setRealBrandCounts({ brand_c: 0, brand_a: 0, brand_b: 0, brand_d: 0 });
      recentSortTimesRealRef.current = [];
    }

    const resetPoints: ThroughputPoint[] = Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 1000).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      ppm: 0,
      total: 0,
      bin1: 0,
      bin2: 0,
      bin3: 0,
      speed: 0,
    }));

    if (isSimulationRef.current) {
      setSimThroughput(resetPoints);
    } else {
      setRealThroughput(resetPoints);
    }
  }, []);

  // Clear specific bin
  const handleClearBin = useCallback((binIndex: 1 | 2 | 3) => {
    industrialAudio.playClick();
    
    const isSim = isSimulationRef.current;
    const current = isSim ? simBinCountsRef.current : realBinCountsRef.current;
    const next = { ...current, [`bin${binIndex}`]: 0 } as BinCounts;
    saveBinCountsLocal(next, isSim);
    void updateSyncState({ binCounts: next });
    if (isSim) {
      setSimBinCounts(next);
    } else {
      setRealBinCounts(next);
      onPublishCommand?.("reset_bin", binIndex);
    }
  }, [onPublishCommand, simBinCountsRef, realBinCountsRef]);

  // Set / Adjust specific bin capacity (điều chỉnh độ rộng / sức chứa khay: 5 - 50 SP)
  const handleSetBinCapacity = useCallback((binIndex: 1 | 2 | 3, capacity: number) => {
    const isSim = isSimulationRef.current;
    const clamped = Number.isFinite(capacity) ? Math.max(5, Math.min(50, Math.round(capacity))) : 50;
    const current = isSim ? simBinCapacitiesRef.current : realBinCapacitiesRef.current;
    const next = { ...current, [`bin${binIndex}`]: clamped } as BinCapacities;
    saveBinCapacitiesLocal(next, isSim);
    void updateSyncState({ binCapacities: next });
    if (isSim) {
      simBinCapacitiesRef.current = next;
      setSimBinCapacities(next);
    } else {
      realBinCapacitiesRef.current = next;
      setRealBinCapacities(next);
    }
  }, [simBinCapacitiesRef, realBinCapacitiesRef]);

  // Set / Adjust specific bin count directly (đặt số lượng hoặc xóa về 0)
  const handleSetBinCount = useCallback((binIndex: 1 | 2 | 3, count: number) => {
    const isSim = isSimulationRef.current;
    if (!isSim) return;
    const capacities = isSim ? simBinCapacitiesRef.current : realBinCapacitiesRef.current;
    const maxCap = capacities[`bin${binIndex}` as keyof BinCapacities] || 50;
    const clamped = Math.max(0, Math.min(maxCap, Math.round(Number(count) || 0)));
    const current = isSim ? simBinCountsRef.current : realBinCountsRef.current;
    const next = { ...current, [`bin${binIndex}`]: clamped } as BinCounts;
    saveBinCountsLocal(next, isSim);
    void updateSyncState({ binCounts: next });
    if (isSim) {
      simBinCountsRef.current = next;
      setSimBinCounts(next);
    } else {
      setRealBinCounts(next);
    }

  }, [simBinCountsRef, realBinCountsRef, simBinCapacitiesRef, realBinCapacitiesRef]);

  // Clear alerts
  const handleClearAlerts = useCallback(() => {
    industrialAudio.playClick();
    clearAlertHistory();
    setAlerts([]);
  }, []);

  // Active data views based on current mode
  const records = isSimulation ? simRecords : realRecords;
  const binCounts = isSimulation ? simBinCounts : realBinCounts;
  const routedBinCounts = useMemo(() => {
    const counts: BinCounts = { bin1: 0, bin2: 0, bin3: 0 };
    for (const record of records) {
      const bin = record.routed_bin ?? record.actual_bin;
      if (bin === 1) counts.bin1++;
      else if (bin === 2) counts.bin2++;
      else if (bin === 3) counts.bin3++;
    }
    return counts;
  }, [records]);
  const binCapacities = isSimulation ? simBinCapacities : realBinCapacities;
  const brandCounts = isSimulation ? simBrandCounts : realBrandCounts;
  const throughputHistory = isSimulation ? simThroughput : realThroughput;

  const setRecords = useCallback((action: React.SetStateAction<ClassificationRecord[]>) => {
    if (isSimulationRef.current) {
      setSimRecords(action);
    } else {
      setRealRecords(action);
    }
  }, []);

  const setBinCounts = useCallback(
    (action: React.SetStateAction<{ bin1: number; bin2: number; bin3: number }>) => {
      if (isSimulationRef.current) {
        setSimBinCounts(action);
      } else {
        setRealBinCounts(action);
      }
    },
    []
  );

  const setBinCapacities = useCallback(
    (action: React.SetStateAction<BinCapacities>) => {
      if (isSimulationRef.current) {
        setSimBinCapacities(action);
      } else {
        setRealBinCapacities(action);
      }
    },
    []
  );

  const setBrandCounts = useCallback(
    (action: React.SetStateAction<Record<string, number>>) => {
      if (isSimulationRef.current) {
        setSimBrandCounts(action);
      } else {
        setRealBrandCounts(action);
      }
    },
    []
  );

  // Unresolved alert count (BUG-05 fix)
  const unresolvedAlertCount = useMemo(
    () => alerts.filter((a) => !a.resolved).length,
    [alerts]
  );

  const applyIncomingSyncState = useCallback((incomingState: DashboardSyncState) => {
    if (incomingState.mode !== undefined) {
      const isSim = incomingState.mode === "sim";
      setIsSimulation(isSim);
      saveOperatingMode(isSim);
    }
    if (incomingState.binCounts) {
      const counts = incomingState.binCounts;
      if (isSimulationRef.current) {
        setSimBinCounts(counts);
        simBinCountsRef.current = counts;
        saveBinCountsLocal(counts, true);
      } else {
        setRealBinCounts(counts);
        realBinCountsRef.current = counts;
        saveBinCountsLocal(counts, false);
      }
    }
    if (incomingState.binCapacities) {
      const caps = incomingState.binCapacities;
      if (isSimulationRef.current) {
        setSimBinCapacities(caps);
        simBinCapacitiesRef.current = caps;
        saveBinCapacitiesLocal(caps, true);
      } else {
        setRealBinCapacities(caps);
        realBinCapacitiesRef.current = caps;
        saveBinCapacitiesLocal(caps, false);
      }
    }
    if (incomingState.brandCounts) {
      if (isSimulationRef.current) {
        setSimBrandCounts(incomingState.brandCounts);
      } else {
        setRealBrandCounts(incomingState.brandCounts);
      }
    }
  }, []);

  const applyIncomingSyncRecords = useCallback((incomingRecords: ClassificationRecord[], incomingCounts?: BinCounts, incomingBrands?: Record<string, number>) => {
    if (!Array.isArray(incomingRecords) || incomingRecords.length === 0) return;
    if (isSimulationRef.current) {
      setSimRecords((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const newOnes = incomingRecords.filter((r) => !ids.has(r.id));
        const merged = [...newOnes, ...prev].slice(0, 500);
        saveClassificationRecordsLocal(merged, true);
        return merged;
      });
      if (incomingCounts) {
        setSimBinCounts(incomingCounts);
        simBinCountsRef.current = incomingCounts;
        saveBinCountsLocal(incomingCounts, true);
      }
      if (incomingBrands) {
        setSimBrandCounts(incomingBrands);
      }
    } else {
      setRealRecords((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const newOnes = incomingRecords.filter((r) => !ids.has(r.id));
        const merged = [...newOnes, ...prev].slice(0, 500);
        saveClassificationRecordsLocal(merged, false);
        return merged;
      });
      if (incomingCounts) {
        setRealBinCounts(incomingCounts);
        realBinCountsRef.current = incomingCounts;
        saveBinCountsLocal(incomingCounts, false);
      }
      if (incomingBrands) {
        setRealBrandCounts(incomingBrands);
      }
    }
  }, []);

  const triggerManualSync = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) return false;
      const data = await res.json();
      if (data.state) {
        applyIncomingSyncState(data.state);
      }
      if (data.history && Array.isArray(data.history) && data.history.length > 0) {
        applyIncomingSyncRecords(data.history, data.state?.binCounts, data.state?.brandCounts);
      }
      return true;
    } catch {
      return false;
    }
  }, [applyIncomingSyncState, applyIncomingSyncRecords]);

  const applyIncomingClearHistory = useCallback(() => {
    if (isSimulationRef.current) {
      setSimRecords([]);
      setSimBinCounts({ bin1: 0, bin2: 0, bin3: 0 });
      setSimBrandCounts({ brand_c: 0, brand_a: 0, brand_b: 0, brand_d: 0 });
      clearClassificationHistory(true);
    } else {
      setRealRecords([]);
      setRealBinCounts({ bin1: 0, bin2: 0, bin3: 0 });
      setRealBrandCounts({ brand_c: 0, brand_a: 0, brand_b: 0, brand_d: 0 });
      clearClassificationHistory(false);
    }
  }, []);

  return {
    isClient,
    isSimulation,
    setIsSimulation,
    toggleSimulationMode,
    generateSimulationDemoData,
    isSimulationRef,
    simRecordsRef,
    realRecordsRef,
    simBinCountsRef,
    realBinCountsRef,
    simBinCapacitiesRef,
    realBinCapacitiesRef,
    recentSortTimesSimRef,
    recentSortTimesRealRef,
    records,
    setRecords,
    binCounts,
    routedBinCounts,
    setBinCounts,
    binCapacities,
    setBinCapacities,
    brandCounts,
    setBrandCounts,
    throughputHistory,
    setSimThroughput,
    setRealThroughput,
    alerts,
    setAlerts,
    handleClearAlerts,
    handleClearBin,
    handleSetBinCount,
    handleSetBinCapacity,
    unresolvedAlertCount,
    handleRealHardwareDetection,
    handleHardwareClassification,
    handleHardwareBinCounts,
    handleItemSorted,
    executeClearHistory,
    applyIncomingSyncState,
    applyIncomingSyncRecords,
    applyIncomingClearHistory,
    triggerManualSync,
  };
}

