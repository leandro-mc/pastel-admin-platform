export type User = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  accessFailedCount: number;
  lockoutEnd: string | null;
  createdAt: string;
  roles: string[];
};

export type Profile = {
  user: User;
  permissions: string[];
};

export type Screen = "dashboard" | "settings" | "profile";

export type Notice = {
  message: string;
  tone: "success" | "error";
};

export type AuthenticationValues = {
  email: string;
  password: string;
  displayName?: string;
};

export type PasswordChangeValues = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
};

export type Notify = (message: string, tone?: "success" | "error") => void;
