/**
 * Session state for the workspace.
 *
 * The JWT is the single source of truth: it is restored from storage on a cold
 * start, validated against `GET /api/auth/me`, and attached to every API call
 * and the Socket.IO handshake by the transport layer. The signed-in role
 * always comes from the server — the UI never lets anyone pick their own role.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { configureApiAuth } from "../services/apiClient";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  login as loginRequest,
  register as registerRequest,
  storeToken,
  type RegisterInput,
} from "../services/authService";
import type { ApiUser, ApiUserRole } from "../services/apiTypes";

export type AuthStatus = "initialising" | "authenticated" | "anonymous";

export interface AuthPermissions {
  /** Brokerage staff: leads, documents, tasks, dashboard, automations. */
  canViewWorkspace: boolean;
  canViewDashboard: boolean;
  canManageTasks: boolean;
  /** Only a brokerage admin may create/edit/delete email templates. */
  canManageTemplates: boolean;
  canIngestLeads: boolean;
  /** A client only ever sees its own dossier. */
  isClient: boolean;
  isPlatformAdmin: boolean;
}

const NO_PERMISSIONS: AuthPermissions = {
  canViewWorkspace: false,
  canViewDashboard: false,
  canManageTasks: false,
  canManageTemplates: false,
  canIngestLeads: false,
  isClient: false,
  isPlatformAdmin: false,
};

export function permissionsForRole(
  role: ApiUserRole | undefined,
): AuthPermissions {
  switch (role) {
    case "brokerage_admin":
      return {
        canViewWorkspace: true,
        canViewDashboard: true,
        canManageTasks: true,
        canManageTemplates: true,
        canIngestLeads: true,
        isClient: false,
        isPlatformAdmin: false,
      };
    case "advisor":
      return {
        canViewWorkspace: true,
        canViewDashboard: true,
        canManageTasks: true,
        canManageTemplates: false,
        canIngestLeads: true,
        isClient: false,
        isPlatformAdmin: false,
      };
    case "client":
      return { ...NO_PERMISSIONS, isClient: true };
    case "platform_admin":
      return { ...NO_PERMISSIONS, isPlatformAdmin: true };
    default:
      return NO_PERMISSIONS;
  }
}

export interface AuthContextValue {
  status: AuthStatus;
  user: ApiUser | null;
  token: string | null;
  error: string | null;
  isSubmitting: boolean;
  permissions: AuthPermissions;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (input: RegisterInput) => Promise<boolean>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<AuthStatus>("initialising");
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // Keep the transport layer pointed at the live token without re-binding.
  useEffect(() => {
    configureApiAuth({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        // Any 401 means the session is gone: drop it and show the sign-in view.
        tokenRef.current = null;
        setToken(null);
        setUser(null);
        setStatus("anonymous");
      },
    });
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Cold start: restore a stored token and confirm it with the API.
  useEffect(() => {
    let cancelled = false;
    const stored = getStoredToken();
    if (!stored) {
      setStatus("anonymous");
      return;
    }

    tokenRef.current = stored;
    setToken(stored);
    fetchCurrentUser()
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredToken();
        tokenRef.current = null;
        setToken(null);
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((session: { token: string; user: ApiUser }) => {
    storeToken(session.token);
    tokenRef.current = session.token;
    setToken(session.token);
    setUser(session.user);
    setError(null);
    setStatus("authenticated");
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        applySession(await loginRequest(email, password));
        return true;
      } catch (caught) {
        setError(messageFor(caught, "Unable to sign in."));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: RegisterInput): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        applySession(await registerRequest(input));
        return true;
      } catch (caught) {
        setError(messageFor(caught, "Unable to create the brokerage account."));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [applySession],
  );

  const signOut = useCallback(() => {
    clearStoredToken();
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setError(null);
    setStatus("anonymous");
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      error,
      isSubmitting,
      permissions: permissionsForRole(user?.role),
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [status, user, token, error, isSubmitting, signIn, signUp, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
  return context;
}


