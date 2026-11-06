import { HistoryController } from "../controllers/historyController";
import { HistoryFilterParams } from "../services/historyService";

export const HistoryRoutes = {
  handleGet(params: HistoryFilterParams) {
    return HistoryController.get(params);
  },

  handlePost(payload: unknown) {
    return HistoryController.add(payload);
  },

  handleDelete() {
    return HistoryController.clear();
  },
};
