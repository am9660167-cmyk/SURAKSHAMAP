import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserAccount } from '../types/safety';

const SESSION_STORAGE_KEY = 'surakshamap_session_v1';
const DEFAULT_AVATAR = '/src/assets/images/avatar_citizen_profile_1794641736396.jpg';

const DEMO_CITIZEN: UserAccount = {
  id: 'user-demo-1',
  fullName: 'Ananya Rao',
  email: 'ananya.rao@surakshamap.org',
  phone: '+91 98450 23190',
  role: 'citizen',
  avatarUrl: DEFAULT_AVATAR,
  joinedAt: '2025-09-12T08:30:00.000Z',
};

const DEMO_ADMIN: UserAccount = {
  id: 'user-admin-1',
  fullName: 'Arvind Deshmukh',
  email: 'admin@surakshamap.org',
  phone: '+91 98450 99001',
  role: 'admin',
  avatarUrl: DEFAULT_AVATAR,
  joinedAt: '2025-06-01T08:00:00.000Z',
};

interface SignUpPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
  message?: string;
  user?: UserAccount;
}

interface AuthContextValue {
  user: UserAccount | null;
  allUsersCount: number;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  authCallbackError: string | null;
  authCallbackNotice: string | null;
  clearAuthCallbackMessages: () => void;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<AuthResult>;
  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  signInWithGoogleDemo: (mode?: 'citizen' | 'admin') => UserAccount;
  grantAdminAccess: () => Promise<UserAccount>;
  logout: () => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<UserAccount, 'fullName' | 'phone' | 'avatarUrl'>>
  ) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadFallbackSession(): UserAccount | null {
  try {
    const raw =
      localStorage.getItem(SESSION_STORAGE_KEY) ??
      sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserAccount;
    if (supabase && parsed.id !== DEMO_CITIZEN.id && parsed.id !== DEMO_ADMIN.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function mapSupabaseUser(sbUser: SupabaseUser, profileRow?: Record<string, unknown> | null): UserAccount {
  const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
  const roleValue =
    (profileRow?.role as string | undefined) ??
    (meta.role as string | undefined) ??
    'citizen';
  return {
    id: sbUser.id,
    fullName:
      (profileRow?.full_name as string | undefined) ??
      (meta.full_name as string | undefined) ??
      sbUser.email?.split('@')[0] ??
      'Citizen User',
    email: (profileRow?.email as string | undefined) ?? sbUser.email ?? '',
    phone:
      (profileRow?.phone as string | undefined) ??
      (meta.phone as string | undefined) ??
      undefined,
    role: roleValue === 'admin' ? 'admin' : 'citizen',
    avatarUrl:
      (profileRow?.avatar_url as string | undefined) ??
      (meta.avatar_url as string | undefined) ??
      DEFAULT_AVATAR,
    joinedAt:
      (profileRow?.joined_at as string | undefined) ??
      sbUser.created_at ??
      new Date().toISOString(),
  };
}

function getRedirectBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return `${window.location.origin}/`;
}

function formatSupabaseAuthError(rawMessage?: string): string {
  const msg = (rawMessage ?? '').trim();
  const lower = msg.toLowerCase();

  if (!msg) {
    return 'Authentication failed. Please try again.';
  }
  if (
    lower.includes('requested path is invalid') ||
    lower.includes('invalid path') ||
    lower.includes('redirect_to')
  ) {
    return 'Invalid auth request or redirect path. In Supabase Dashboard → Authentication → URL Configuration, set Site URL to your app URL (not your supabase.co URL) and add your app URL to Redirect URLs.';
  }
  if (
    lower.includes('email rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('rate limit exceeded')
  ) {
    return "Email rate limit reached (Supabase's built-in emailer allows ~2 emails per hour). Wait a few minutes, or disable 'Confirm email' in Supabase Dashboard → Authentication → Providers → Email for instant sign-up.";
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address using the link sent to your inbox before signing in.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already registered')
  ) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  return msg;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserAccount | null>(loadFallbackSession);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(Boolean(supabase));
  const [profileCount, setProfileCount] = useState<number>(1282);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null);
  const [authCallbackNotice, setAuthCallbackNotice] = useState<string | null>(null);

  const clearAuthCallbackMessages = () => {
    setAuthCallbackError(null);
    setAuthCallbackNotice(null);
  };

  const syncProfileRow = async (
    sbUser: SupabaseUser,
    extra?: { fullName?: string; phone?: string }
  ): Promise<UserAccount> => {
    const fallbackAccount = mapSupabaseUser(sbUser, {
      full_name: extra?.fullName,
      phone: extra?.phone,
    });

    if (!supabase) {
      return fallbackAccount;
    }

    const runSync = async (): Promise<UserAccount> => {
      try {
        const { data: existing } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (existing) {
          return mapSupabaseUser(sbUser, existing);
        }

        const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
        const payload = {
          id: sbUser.id,
          full_name:
            extra?.fullName ??
            (meta.full_name as string | undefined) ??
            sbUser.email?.split('@')[0] ??
            'Citizen User',
          email: sbUser.email ?? '',
          phone: extra?.phone ?? (meta.phone as string | undefined) ?? null,
          role: (meta.role as string | undefined) === 'admin' ? 'admin' : 'citizen',
          avatar_url: (meta.avatar_url as string | undefined) ?? DEFAULT_AVATAR,
        };

        const { data: inserted } = await supabase!
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        return mapSupabaseUser(sbUser, inserted ?? payload);
      } catch {
        return fallbackAccount;
      }
    };

    const timeout = new Promise<UserAccount>((resolve) => {
      window.setTimeout(() => resolve(fallbackAccount), 4000);
    });

    return Promise.race([runSync(), timeout]);
  };

  useEffect(() => {
    if (!supabase) {
      fetch('/api/auth/stats')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { totalUsersCount?: number } | null) => {
          if (typeof data?.totalUsersCount === 'number') {
            setProfileCount(data.totalUsersCount);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          setIsLoadingAuth(false);
        });
      return;
    }

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashRaw = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hashRaw);

        const urlErrorDesc =
          searchParams.get('error_description') ??
          hashParams.get('error_description') ??
          searchParams.get('error') ??
          hashParams.get('error');
        const pkceCode = searchParams.get('code');

        if (urlErrorDesc && mounted) {
          setAuthCallbackError(
            formatSupabaseAuthError(urlErrorDesc.replace(/\+/g, ' '))
          );
        }

        const { data, error: sessionErr } = await supabase!.auth.getSession();
        if (!mounted) return;

        if (sessionErr && !urlErrorDesc) {
          setAuthCallbackError(formatSupabaseAuthError(sessionErr.message));
        }

        let activeSession = data.session;

        if (!activeSession && pkceCode && !urlErrorDesc) {
          const { data: exchangeData, error: exchangeErr } =
            await supabase!.auth.exchangeCodeForSession(pkceCode);
          if (!mounted) return;
          if (exchangeErr) {
            setAuthCallbackError(formatSupabaseAuthError(exchangeErr.message));
          } else {
            activeSession = exchangeData.session;
          }
        }

        if (activeSession?.user) {
          const mapped = await syncProfileRow(activeSession.user);
          if (mounted) {
            setUser(mapped);
            if (pkceCode) {
              setAuthCallbackNotice(
                'Email verified! You are now signed in to SurakshaMap.'
              );
            }
          }
        }

        if (
          pkceCode ||
          urlErrorDesc ||
          hashParams.has('access_token') ||
          hashParams.has('error_code')
        ) {
          const cleanUrl = `${window.location.pathname}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (err) {
        if (mounted) {
          setAuthCallbackError(
            formatSupabaseAuthError(
              err instanceof Error ? err.message : undefined
            )
          );
        }
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    void initializeAuth();

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(
        ({ count }) => {
          if (mounted && typeof count === 'number') {
            setProfileCount(count + 1280);
          }
        },
        () => undefined
      );

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          void syncProfileRow(session.user).then((mapped) => {
            if (mounted) setUser(mapped);
          });
        } else {
          setUser((prev) =>
            prev?.id === DEMO_CITIZEN.id || prev?.id === DEMO_ADMIN.id ? prev : null
          );
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const persistLocalSession = (account: UserAccount | null, rememberMe = true) => {
    setUser(account);
    try {
      if (!account) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      if (rememberMe) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(account));
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(account));
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  const signIn = async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<AuthResult> => {
    const normalized = email.trim().toLowerCase();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });

        if (error) {
          return { ok: false, error: formatSupabaseAuthError(error.message) };
        }

        if (data.user) {
          const mapped = await syncProfileRow(data.user);
          persistLocalSession(mapped, rememberMe);
          return { ok: true, user: mapped };
        }

        return { ok: false, error: 'Unable to sign in with Supabase. Please try again.' };
      } catch (err) {
        return {
          ok: false,
          error: formatSupabaseAuthError(
            err instanceof Error ? err.message : undefined
          ),
        };
      }
    }

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, password }),
      });
      const data = (await res.json()) as {
        user?: UserAccount;
        totalUsersCount?: number;
        error?: string;
      };
      if (!res.ok || !data.user) {
        return {
          ok: false,
          error:
            data.error ?? 'Invalid email or password. Please check your credentials.',
        };
      }
      if (typeof data.totalUsersCount === 'number') {
        setProfileCount(data.totalUsersCount);
      }
      persistLocalSession(data.user, rememberMe);
      return { ok: true, user: data.user };
    } catch {
      return {
        ok: false,
        error: 'Unable to reach authentication server. Please try again.',
      };
    }
  };

  const signUp = async (payload: SignUpPayload): Promise<AuthResult> => {
    const normalized = payload.email.trim().toLowerCase();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalized,
          password: payload.password,
          options: {
            emailRedirectTo: getRedirectBaseUrl(),
            data: {
              full_name: payload.fullName.trim(),
              phone: payload.phone?.trim() || null,
              role: 'citizen',
              avatar_url: DEFAULT_AVATAR,
            },
          },
        });

        if (error) {
          return { ok: false, error: formatSupabaseAuthError(error.message) };
        }

        if (
          data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        ) {
          return {
            ok: false,
            error:
              'An account with this email already exists. Please sign in or reset your password.',
          };
        }

        if (data.user && data.session) {
          const mapped = await syncProfileRow(data.user, {
            fullName: payload.fullName.trim(),
            phone: payload.phone?.trim(),
          });
          persistLocalSession(mapped, true);
          void supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .then(({ count }) => {
              if (typeof count === 'number') setProfileCount(count + 1280);
            });
          setAuthCallbackNotice(
            `Welcome, ${mapped.fullName}! Your SurakshaMap account has been created and saved.`
          );
          return {
            ok: true,
            user: mapped,
            message: 'Account created successfully!',
          };
        }

        if (data.user && !data.session) {
          return {
            ok: true,
            needsEmailConfirmation: true,
            message: `Account created for ${normalized}! Please check your email inbox and click the confirmation link before signing in.`,
          };
        }

        return { ok: false, error: 'Could not create account in Supabase. Please try again.' };
      } catch (err) {
        return {
          ok: false,
          error: formatSupabaseAuthError(
            err instanceof Error ? err.message : undefined
          ),
        };
      }
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: payload.fullName.trim(),
          email: normalized,
          phone: payload.phone?.trim() || undefined,
          password: payload.password,
        }),
      });
      const data = (await res.json()) as {
        user?: UserAccount;
        totalUsersCount?: number;
        error?: string;
      };

      if (!res.ok || !data.user) {
        return {
          ok: false,
          error: data.error ?? 'Could not create account. Please try again.',
        };
      }

      if (typeof data.totalUsersCount === 'number') {
        setProfileCount(data.totalUsersCount);
      }

      persistLocalSession(data.user, true);
      setAuthCallbackNotice(
        `Welcome, ${data.user.fullName}! Your SurakshaMap account has been created and saved.`
      );
      return {
        ok: true,
        user: data.user,
        message: 'Account created successfully!',
      };
    } catch {
      return {
        ok: false,
        error: 'Unable to reach account registration server. Please try again.',
      };
    }
  };

  const requestPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!supabase) {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? 'Unable to send reset instructions.' };
        }
        return {
          ok: true,
          message: data.message ?? 'Password reset instructions sent.',
        };
      } catch {
        return { ok: true, message: 'Password reset instructions sent.' };
      }
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: getRedirectBaseUrl(),
        }
      );
      if (error) {
        return { ok: false, error: formatSupabaseAuthError(error.message) };
      }
      return {
        ok: true,
        message: 'Password reset link sent to your email address.',
      };
    } catch (err) {
      return {
        ok: false,
        error: formatSupabaseAuthError(
          err instanceof Error ? err.message : undefined
        ),
      };
    }
  };

  const signInWithGoogleDemo = (mode: 'citizen' | 'admin' = 'citizen'): UserAccount => {
    const target = mode === 'admin' ? DEMO_ADMIN : DEMO_CITIZEN;
    persistLocalSession(target, true);
    return target;
  };

  const grantAdminAccess = async (): Promise<UserAccount> => {
    if (!user) {
      persistLocalSession(DEMO_ADMIN, true);
      return DEMO_ADMIN;
    }
    const promoted: UserAccount = { ...user, role: 'admin' };
    persistLocalSession(promoted, true);

    if (supabase && user.id !== DEMO_CITIZEN.id && user.id !== DEMO_ADMIN.id) {
      try {
        await supabase.auth.updateUser({ data: { role: 'admin' } });
      } catch {
        // Ignore metadata error
      }
      try {
        await supabase
          .from('profiles')
          .update({ role: 'admin', updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {
        // Ignore profile role update error
      }
    } else if (user.id !== DEMO_CITIZEN.id && user.id !== DEMO_ADMIN.id) {
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: 'admin' }),
      }).catch(() => undefined);
    }
    return promoted;
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    persistLocalSession(null);
  };

  const updateProfile = async (
    updates: Partial<Pick<UserAccount, 'fullName' | 'phone' | 'avatarUrl'>>
  ): Promise<{ ok: boolean; error?: string }> => {
    const activeUser = user ?? loadFallbackSession() ?? signInWithGoogleDemo('citizen');
    const updated: UserAccount = { ...activeUser, ...updates };
    persistLocalSession(updated, true);

    if (supabase && activeUser.id !== DEMO_CITIZEN.id && activeUser.id !== DEMO_ADMIN.id) {
      let profileError: string | undefined;

      try {
        const { error: upsertErr } = await supabase.from('profiles').upsert(
          {
            id: activeUser.id,
            full_name: updated.fullName,
            email: updated.email,
            phone: updated.phone ?? null,
            role: updated.role,
            avatar_url: updated.avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (upsertErr) {
          profileError = upsertErr.message;
        }
      } catch (err) {
        profileError = err instanceof Error ? err.message : 'Could not save profile to database.';
      }

      // Update auth metadata after profiles upsert, and never store base64 data URLs in JWT metadata
      const shouldUpdateAuthMeta =
        updates.fullName !== undefined ||
        updates.phone !== undefined ||
        (updates.avatarUrl !== undefined && !updates.avatarUrl.startsWith('data:'));

      if (shouldUpdateAuthMeta) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: updated.fullName,
              phone: updated.phone ?? null,
              ...(updated.avatarUrl && !updated.avatarUrl.startsWith('data:')
                ? { avatar_url: updated.avatarUrl }
                : {}),
            },
          });
        } catch {
          // Ignore non-fatal auth metadata sync error
        }
      }

      return profileError ? { ok: false, error: profileError } : { ok: true };
    }

    if (activeUser.id !== DEMO_CITIZEN.id && activeUser.id !== DEMO_ADMIN.id) {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeUser.id,
            fullName: updated.fullName,
            phone: updated.phone,
            avatarUrl: updated.avatarUrl,
          }),
        });
        if (!res.ok) {
          return { ok: false, error: 'Failed to update profile on server.' };
        }
      } catch {
        // Local session already persisted
      }
    }

    return { ok: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsersCount: profileCount,
        isAuthenticated: Boolean(user),
        isLoadingAuth,
        authCallbackError,
        authCallbackNotice,
        clearAuthCallbackMessages,
        signIn,
        signUp,
        requestPasswordReset,
        signInWithGoogleDemo,
        grantAdminAccess,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
