import { getServerConfig, updateServerConfig, resetServerConfig } from "../services/configService";

export const ConfigController = {
  get() {
    const config = getServerConfig();
    return { success: true, config };
  },

  update(payload: unknown) {
    const result = updateServerConfig(payload);
    return result;
  },

  reset() {
    const config = resetServerConfig();
    return { success: true, config };
  },
};
