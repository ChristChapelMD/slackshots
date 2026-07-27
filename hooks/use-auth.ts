"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { authClient } from "@/lib/auth/client";
import {
  UseAuthReturn,
  AuthError,
  SignUpParams,
  AuthResult,
  AuthSession,
  SignInParams,
} from "@/types/auth";

export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signInWithSlack = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const { data, error } = await authClient.signIn.social({
        provider: "slack",
        callbackURL: "/dashboard",
      });

      if (error) {
        const authError: AuthError =
          error instanceof Error ? error : new Error(String(error));

        throw authError;
      }

      return { data, error: null, success: true };
    } catch (err: any) {
      const authError: AuthError =
        err instanceof Error ? err : new Error("Sign in failed");

      if (
        err.code === "INVALID_CREDENTIALS" ||
        err.message?.includes("Invalid")
      ) {
        authError.message = "Invalid email or password";
      } // add the slack specifc error codes (if better auth exposes them)

      setError(authError);

      return { data: null, error: authError, success: false };
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const signUp = useCallback(
    async ({
      email,
      password,
      name,
      callbackURL,
    }: SignUpParams): Promise<AuthResult> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const { data, error } = await authClient.signUp.email({
          email: email.toLowerCase().trim(),
          password,
          name: name.trim(),
          callbackURL,
        });

        if (error) {
          const authError: AuthError =
            error instanceof Error ? error : new Error(String(error));

          throw authError;
        }

        return { data, error: null, success: true };
      } catch (err: any) {
        const authError: AuthError =
          err instanceof Error ? err : new Error("Sign up failed");

        if (
          err.code === "USER_ALREADY_EXISTS" ||
          err.message?.includes("already exists")
        ) {
          authError.message = "An account with this email already exists";
          authError.field = "email";
        } // add more later

        setError(authError);

        return { data: null, error: authError, success: false };
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [],
  );

  const signIn = useCallback(
    async ({
      email,
      password,
      callbackURL,
      rememberMe,
    }: SignInParams): Promise<AuthResult> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const { data, error } = await authClient.signIn.email({
          email: email.toLowerCase().trim(),
          password,
          callbackURL,
          rememberMe,
          fetchOptions: {
            credentials: "include",
          },
        });

        if (error) {
          const authError: AuthError =
            error instanceof Error ? error : new Error(String(error));

          throw authError;
        }

        return { data, error: null, success: true };
      } catch (err: any) {
        const authError: AuthError =
          err instanceof Error ? err : new Error("Sign in failed");

        if (
          err.code === "INVALID_CREDENTIALS" ||
          err.message?.includes("Invalid")
        ) {
          authError.message = "Invalid email or password";
        } // add more later

        setError(authError);

        return { data: null, error: authError, success: false };
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await authClient.signOut();
      setError(null);
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  }, []);

  const getSession = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const result = await authClient.getSession();

      return result.data;
    } catch (err) {
      console.error("Unexpected getSession error:", err);

      return null;
    }
  }, []);

  const isAuthenticated = Boolean(session?.user);

  return {
    session,
    error,
    loading,
    sessionLoading,
    isAuthenticated,

    signInWithSlack,
    signUp,
    signIn,
    signOut,
    getSession,
    clearError,
  };
}
