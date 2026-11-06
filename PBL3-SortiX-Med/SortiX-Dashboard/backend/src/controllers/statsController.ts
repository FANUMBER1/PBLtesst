import { getSystemStats } from "../services/statsService";

export const StatsController = {
  get() {
    const stats = getSystemStats();
    return { success: true, stats };
  },
};
