import { StatsController } from "../controllers/statsController";

export const StatsRoutes = {
  handleGet() {
    return StatsController.get();
  },
};
