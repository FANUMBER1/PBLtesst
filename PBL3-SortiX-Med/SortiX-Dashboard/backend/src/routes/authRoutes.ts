import { UserService } from "../services/userService";

export const AuthRoutes = {
  async handleRegister(body: unknown) {
    const result = await UserService.register(body);
    return {
      status: result.success ? 201 : 400,
      body: result,
    };
  },

  async handleLogin(body: unknown) {
    const result = await UserService.login(body);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },

  async handleForgotPassword(body: unknown) {
    const result = await UserService.forgotPassword(body);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },

  async handleResetPassword(body: unknown) {
    const result = await UserService.resetPassword(body);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  },
};

