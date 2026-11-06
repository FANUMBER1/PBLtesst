import { ConfigController } from "../controllers/configController";

export const ConfigRoutes = {
  handleGet() {
    return ConfigController.get();
  },

  handlePost(payload: unknown) {
    return ConfigController.update(payload);
  },

  handleReset() {
    return ConfigController.reset();
  },
};
