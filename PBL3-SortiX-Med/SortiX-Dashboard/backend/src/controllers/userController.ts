import { UserService } from "../services/userService";

export const UserController = {
  getProfile(userId: string) {
    return UserService.getProfile(userId);
  },

  getAllUsers() {
    return UserService.getAllUsers();
  },

  updateProfile(userId: string, payload: unknown) {
    return UserService.updateProfile(userId, payload);
  },

  async changePassword(userId: string, payload: unknown) {
    return await UserService.changePassword(userId, payload);
  },

  async adminCreateUser(payload: unknown) {
    return await UserService.adminCreateUser(payload);
  },

  async adminUpdateUser(targetId: string, payload: unknown) {
    return await UserService.adminUpdateUser(targetId, payload);
  },

  adminDeleteUser(targetId: string, currentAdminId: string) {
    return UserService.adminDeleteUser(targetId, currentAdminId);
  },
};
