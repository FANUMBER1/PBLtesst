import { UserController } from "../controllers/userController";

export const UserRoutes = {
  handleGetProfile(userId: string) {
    const result = UserController.getProfile(userId);
    return {
      status: result.success ? 200 : 404,
      body: result,
    };
  },

  handleGetAllUsers() {
    const result = UserController.getAllUsers();
    return {
      status: 200,
      body: result,
    };
  },

  handleUpdateProfile(userId: string, body: unknown) {
    const result = UserController.updateProfile(userId, body);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },

  async handleChangePassword(userId: string, body: unknown) {
    const result = await UserController.changePassword(userId, body);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },

  async handleCreateUser(body: unknown) {
    const result = await UserController.adminCreateUser(body);
    return {
      status: result.success ? 201 : 400,
      body: result,
    };
  },

  async handleUpdateUser(targetId: string, body: unknown) {
    const result = await UserController.adminUpdateUser(targetId, body);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },

  handleDeleteUser(targetId: string, currentAdminId: string) {
    const result = UserController.adminDeleteUser(targetId, currentAdminId);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },
};
