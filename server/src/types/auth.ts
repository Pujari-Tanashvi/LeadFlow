import type { UserRole } from "../models/User.js";

export interface AuthContext {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  brokerageId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
