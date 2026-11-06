import { queryClassificationHistory, addClassificationRecord, clearAllHistory, HistoryFilterParams } from "../services/historyService";

export const HistoryController = {
  get(params: HistoryFilterParams) {
    const result = queryClassificationHistory(params);
    return { success: true, ...result };
  },

  add(payload: unknown) {
    const result = addClassificationRecord(payload);
    return result;
  },

  clear() {
    clearAllHistory();
    return { success: true, message: "History cleared successfully" };
  },
};
