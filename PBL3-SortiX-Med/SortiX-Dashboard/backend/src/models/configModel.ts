import { SorterConfig } from "@shared/types";

export const DEFAULT_SORTER_CONFIG: SorterConfig = {
  schema_version: 1,
  config_version: 1,
  device_id: "sorter_01",
  catalog_version: "catalog_01",
  bins: [
    { bin_id: 1, brand_ids: ["brand_c", "brand_b"] },
    { bin_id: 2, brand_ids: ["brand_a"] },
  ],
  default_bin: 3,
  apply_mode: "when_line_empty",
  timestamp: new Date().toISOString(),
};

let currentConfig: SorterConfig = { ...DEFAULT_SORTER_CONFIG };

export const ConfigModel = {
  get(): SorterConfig {
    return JSON.parse(JSON.stringify(currentConfig));
  },

  set(config: SorterConfig): SorterConfig {
    currentConfig = { ...config };
    return this.get();
  },

  reset(): SorterConfig {
    currentConfig = {
      ...DEFAULT_SORTER_CONFIG,
      timestamp: new Date().toISOString(),
    };
    return this.get();
  },
};
