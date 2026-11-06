import { SorterConfig } from "@shared/types";
import { SorterConfigSchema } from "@shared/schemas";
import { ConfigModel, DEFAULT_SORTER_CONFIG } from "../models/configModel";

export { DEFAULT_SORTER_CONFIG };

export function getServerConfig(): SorterConfig {
  return ConfigModel.get();
}

export function updateServerConfig(payload: unknown): {
  success: boolean;
  config?: SorterConfig;
  error?: string;
} {
  try {
    const parsed = SorterConfigSchema.parse(payload) as SorterConfig;
    const current = ConfigModel.get();
    const nextVersion = Math.max(parsed.config_version, current.config_version + 1);
    const updated = ConfigModel.set({
      ...parsed,
      config_version: nextVersion,
      timestamp: new Date().toISOString(),
    });
    return { success: true, config: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid config schema";
    return { success: false, error: message };
  }
}

export function resetServerConfig(): SorterConfig {
  return ConfigModel.reset();
}
