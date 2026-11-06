// Ma trận phân quyền cho hệ thống IoT Dashboard
// Admin: toàn quyền | User: giám sát + xem lịch sử + hồ sơ cá nhân

export type UserRole = "admin" | "user" | "maintenance";

export interface AuthUser {
  id?: string;
  username?: string;
  role: UserRole;
  displayName: string;
  avatar: string;
  email: string;
  loginTime: string;
  sessionToken?: string;
}

// Danh sách tất cả quyền hành động trong hệ thống
export type PermissionAction =
  | "dashboard.view"
  | "conveyor.view"
  | "conveyor.control"        // Start/Pause
  | "conveyor.spawn"          // Nạp phôi
  | "conveyor.estop"          // Dừng khẩn cấp
  | "conveyor.speed"          // Thay đổi tốc độ
  | "analytics.view"
  | "history.view"
  | "history.delete"
  | "history.export"
  | "alerts.view"
  | "alerts.delete"
  | "alerts.configure"
  | "config.view"
  | "config.edit"
  | "config.publish"
  | "devices.view"
  | "devices.control"
  | "devices.configure"
  | "users.view"
  | "users.manage"
  | "profile.view"
  | "profile.edit"
  | "profile.password"
  | "reports.view"
  | "reports.advanced"
  | "settings.mqtt"
  | "settings.system";

// Ma trận quyền: role → danh sách actions được phép
const PERMISSION_MATRIX: Record<UserRole, Set<PermissionAction>> = {
  admin: new Set<PermissionAction>([
    "dashboard.view",
    "conveyor.view",
    "conveyor.control",
    "conveyor.spawn",
    "conveyor.estop",
    "conveyor.speed",
    "analytics.view",
    "history.view",
    "history.delete",
    "history.export",
    "alerts.view",
    "alerts.delete",
    "alerts.configure",
    "config.view",
    "config.edit",
    "config.publish",
    "devices.view",
    "devices.control",
    "devices.configure",
    "users.view",
    "users.manage",
    "profile.view",
    "profile.edit",
    "profile.password",
    "reports.view",
    "reports.advanced",
    "settings.mqtt",
    "settings.system",
  ]),
  maintenance: new Set<PermissionAction>([
    "dashboard.view",
    "conveyor.view",
    "conveyor.control",
    "conveyor.spawn",
    "conveyor.estop",
    "conveyor.speed",
    "analytics.view",
    "history.view",
    "history.export",
    "alerts.view",
    "devices.view",
    "devices.control",
    "config.view",
    "reports.view",
    "profile.view",
    "profile.edit",
    "profile.password",
  ]),
  user: new Set<PermissionAction>([
    "dashboard.view",
    "conveyor.view",
    "analytics.view",
    "history.view",
    "history.export",
    "alerts.view",
    "devices.view",
    "profile.view",
    "profile.edit",
    "profile.password",
    "reports.view",
  ]),
};

/** Kiểm tra xem role có quyền thực hiện action không */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

/** Lấy danh sách tất cả quyền của role */
export function getPermissions(role: UserRole): PermissionAction[] {
  return Array.from(PERMISSION_MATRIX[role] || []);
}

// Dữ liệu người dùng mẫu
export const MOCK_USERS: AuthUser[] = [
  {
    id: "admin-001",
    username: "admin1",
    role: "admin",
    displayName: "Nguyễn Tá Duy Phong",
    avatar: "",
    email: "admin1@gmail.com",
    loginTime: "",
  },
  {
    id: "admin-002",
    username: "admin2",
    role: "admin",
    displayName: "Nguyễn Nhật Minh",
    avatar: "",
    email: "admin2@gmail.com",
    loginTime: "",
  },
  {
    id: "admin-003",
    username: "admin3",
    role: "admin",
    displayName: "Trần Đăng Lợi",
    avatar: "",
    email: "admin3@gmail.com",
    loginTime: "",
  },
  {
    id: "admin-004",
    username: "admin4",
    role: "admin",
    displayName: "Nguyễn Đình Anh Tuấn",
    avatar: "",
    email: "admin4@gmail.com",
    loginTime: "",
  },
  {
    id: "admin-legacy",
    username: "admin",
    role: "admin",
    displayName: "Quản trị viên hệ thống (Legacy)",
    avatar: "",
    email: "admin@pbl3.local",
    loginTime: "",
  },
  {
    id: "usr-demo-002",
    username: "maintenance",
    role: "maintenance",
    displayName: "Kỹ thuật viên bảo trì",
    avatar: "",
    email: "maintenance@pbl3.local",
    loginTime: "",
  },
  {
    id: "usr-1789661442408-kwp0",
    username: "duyphong",
    role: "user",
    displayName: "duyphong",
    avatar: "",
    email: "duyphong@gmail.com",
    loginTime: "",
  },
  {
    id: "usr-demo-001",
    username: "operator",
    role: "user",
    displayName: "Kỹ thuật viên vận hành",
    avatar: "",
    email: "operator@pbl3.local",
    loginTime: "",
  },
];

// Sidebar menu items cấu hình
export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  href: string;
  requiredPermission?: PermissionAction;
  badge?: string;
  children?: SidebarMenuItem[];
}

export interface SidebarMenuGroup {
  groupLabel: string;
  items: SidebarMenuItem[];
}

export const SIDEBAR_MENU: SidebarMenuGroup[] = [
  {
    groupLabel: "Giám sát",
    items: [
      { id: "dashboard", label: "Tổng quan", icon: "LayoutDashboard", href: "/" },
      { id: "conveyor", label: "Băng tải", icon: "Layers", href: "/conveyor" },
    ],
  },
  {
    groupLabel: "Dữ liệu",
    items: [
      { id: "analytics", label: "Thống kê", icon: "BarChart3", href: "/analytics" },
      { id: "history", label: "Lịch sử", icon: "History", href: "/history" },
      { id: "alerts", label: "Cảnh báo", icon: "Bell", href: "/alerts" },
    ],
  },
  {
    groupLabel: "Hệ thống",
    items: [
      {
        id: "settings",
        label: "Cấu hình & Thiết bị",
        icon: "SlidersHorizontal",
        href: "/settings/config",
        requiredPermission: "config.view",
        children: [
          { id: "settings-config", label: "Cấu hình phân loại", icon: "SlidersHorizontal", href: "/settings/config", requiredPermission: "config.view" },
          { id: "settings-devices", label: "Thiết bị & Phần cứng", icon: "Cpu", href: "/settings/devices", requiredPermission: "devices.view" },
        ],
      },
      { id: "users", label: "Người dùng", icon: "Users", href: "/users", requiredPermission: "users.view" },
    ],
  },
];

// Mock data cho quản lý người dùng
export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  avatar: string;
  createdAt: string;
  lastLogin: string;
}

export const MOCK_USER_LIST: MockUser[] = [
  { id: "u1", name: "A", email: "admin@pbl3.local", role: "admin", status: "active", avatar: "", createdAt: "2026-01-15", lastLogin: "2026-09-11" },
  { id: "u2", name: "B", email: "operator1@pbl3.local", role: "user", status: "active", avatar: "", createdAt: "2026-03-20", lastLogin: "2026-09-10" },
  { id: "u3", name: "c", email: "tech@pbl3.local", role: "user", status: "active", avatar: "", createdAt: "2026-04-10", lastLogin: "2026-09-09" },
  { id: "u4", name: "D", email: "supervisor@pbl3.local", role: "admin", status: "active", avatar: "", createdAt: "2026-02-28", lastLogin: "2026-09-11" },
  { id: "u5", name: "123", email: "maintenance@pbl3.local", role: "user", status: "inactive", avatar: "", createdAt: "2026-05-15", lastLogin: "2026-08-25" },
  { id: "u6", name: "12345", email: "quality@pbl3.local", role: "user", status: "active", avatar: "", createdAt: "2026-06-01", lastLogin: "2026-09-10" },
  { id: "u7", name: "Tiểu Himass", email: "safety@pbl3.local", role: "user", status: "active", avatar: "", createdAt: "2026-07-20", lastLogin: "2026-09-08" },
];
