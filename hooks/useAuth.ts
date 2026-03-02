import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

const AUTH_KEY = "papin_session";
const PROFILE_KEY = "papin_active_profile_id";

type ProfileRow = {
  id: string;
  pair_id: string | null;
  role: string | null;
  name: string | null;
  full_name: string | null;
  photo_url: string | null;
  email: string | null;
  auth_user_id: string | null;
  pair_code_plain: string | null;
  is_owner: boolean | null;
  birthday?: string | null;
  hobbies?: string[] | string | null;
  bio?: string | null;
  [key: string]: unknown;
};

type PairRow = {
  streak: number | null;
  last_pap_date: string | null;
};

type SessionUser = ProfileRow & {
  pair_code: string;
};

type SessionData = {
  me: SessionUser;
  partner: SessionUser | null;
  streak: number;
  last_pap: string | null;
};

type SessionPayload = {
  timestamp: number;
  data: SessionData;
};

const saveSession = (userData: SessionData) => {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      timestamp: Date.now(),
      data: userData,
    }),
  );
};

const toSessionUser = (profile: ProfileRow): SessionUser => ({
  ...profile,
  pair_code: profile.pair_code_plain || "",
});

const getLocalSessionData = (): SessionData | null => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed?.data?.me) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const mergeProfiles = (a: ProfileRow[], b: ProfileRow[]) => {
  const map = new Map<string, ProfileRow>();
  for (const item of [...a, ...b]) {
    if (item?.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
};

export const useAuth = () => {
  const [user, setUser] = useState<SessionData | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  const updateUser = (newMeData: Partial<SessionUser>) => {
    const sessionStr = localStorage.getItem(AUTH_KEY);
    if (!sessionStr) {
      return;
    }

    const session = JSON.parse(sessionStr) as SessionPayload;
    if (!session?.data?.me) {
      return;
    }

    const updatedUserData: SessionData = {
      ...session.data,
      me: { ...session.data.me, ...newMeData },
    };

    saveSession(updatedUserData);
    setUser(updatedUserData);
  };

  const buildSessionFromProfile = useCallback(async (selectedProfile: ProfileRow) => {
    let pairRow: PairRow | null = null;
    let partnerRow: ProfileRow | null = null;

    if (selectedProfile.pair_id) {
      const { data: pairData, error: pairError } = await supabase
        .from("pairs")
        .select("streak, last_pap_date")
        .eq("id", selectedProfile.pair_id)
        .limit(1)
        .maybeSingle();

      if (pairError) {
        throw pairError;
      }

      pairRow = (pairData as PairRow | null) || null;

      const { data: partnerData, error: partnerError } = await supabase
        .from("user_profiles")
        .select(
          "id, pair_id, role, name, full_name, photo_url, email, auth_user_id, pair_code_plain, is_owner, birthday, hobbies, bio",
        )
        .eq("pair_id", selectedProfile.pair_id)
        .neq("id", selectedProfile.id)
        .limit(1)
        .maybeSingle();

      if (partnerError) {
        throw partnerError;
      }

      partnerRow = (partnerData as ProfileRow | null) || null;
    }

    const userData: SessionData = {
      me: toSessionUser(selectedProfile),
      partner: partnerRow ? toSessionUser(partnerRow) : null,
      streak: pairRow?.streak ?? 0,
      last_pap: pairRow?.last_pap_date ?? null,
    };

    saveSession(userData);
    setUser(userData);

    return userData;
  }, []);

  const hydrateUserFromAuth = useCallback(
    async (authUser: User, preferredProfileId?: string) => {
      const authEmail = (authUser.email || "").trim().toLowerCase();

      const { data: byAuthIdRaw, error: byAuthIdError } = await supabase
        .from("user_profiles")
        .select(
          "id, pair_id, role, name, full_name, photo_url, email, auth_user_id, pair_code_plain, is_owner, birthday, hobbies, bio",
        )
        .eq("auth_user_id", authUser.id)
        .limit(20);

      if (byAuthIdError) {
        throw byAuthIdError;
      }

      let byEmailRaw: ProfileRow[] = [];
      if (authEmail) {
        const { data: byEmailData, error: byEmailError } = await supabase
          .from("user_profiles")
          .select(
            "id, pair_id, role, name, full_name, photo_url, email, auth_user_id, pair_code_plain, is_owner, birthday, hobbies, bio",
          )
          .eq("email", authEmail)
          .limit(20);

        if (byEmailError) {
          throw byEmailError;
        }

        byEmailRaw = (byEmailData || []) as ProfileRow[];
      }

      const candidates = mergeProfiles((byAuthIdRaw || []) as ProfileRow[], byEmailRaw);
      if (candidates.length === 0) {
        throw new Error("Profil user tidak ditemukan.");
      }

      let selectedProfile: ProfileRow | undefined;

      if (preferredProfileId) {
        selectedProfile = candidates.find((item) => item.id === preferredProfileId);
      }

      if (!selectedProfile) {
        selectedProfile = candidates.find(
          (item) => item.auth_user_id === authUser.id && item.is_owner === true,
        );
      }

      if (!selectedProfile) {
        selectedProfile = candidates.find((item) => item.auth_user_id === authUser.id);
      }

      if (!selectedProfile) {
        selectedProfile = candidates.find((item) => item.is_owner === true);
      }

      if (!selectedProfile) {
        selectedProfile = candidates[0];
      }

      if (!selectedProfile?.id) {
        throw new Error("Profil user tidak valid.");
      }

      localStorage.setItem(PROFILE_KEY, selectedProfile.id);

      if (selectedProfile.is_owner && selectedProfile.auth_user_id !== authUser.id) {
        await supabase
          .from("user_profiles")
          .update({
            auth_user_id: authUser.id,
          })
          .eq("id", selectedProfile.id);

        selectedProfile = {
          ...selectedProfile,
          auth_user_id: authUser.id,
        };
      }

      return buildSessionFromProfile(selectedProfile);
    },
    [buildSessionFromProfile],
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        const authUser = data.session?.user;
        if (!authUser) {
          const localSession = getLocalSessionData();
          if (localSession) {
            setUser(localSession);
          } else {
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(PROFILE_KEY);
            setUser(null);
          }
          return;
        }

        const preferredProfileId = localStorage.getItem(PROFILE_KEY) || undefined;
        await hydrateUserFromAuth(authUser, preferredProfileId);
      } catch {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(PROFILE_KEY);
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        const localSession = getLocalSessionData();
        if (localSession) {
          setUser(localSession);
        } else {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(PROFILE_KEY);
          setUser(null);
        }
        return;
      }

      try {
        const preferredProfileId = localStorage.getItem(PROFILE_KEY) || undefined;
        await hydrateUserFromAuth(session.user, preferredProfileId);
      } catch {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(PROFILE_KEY);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrateUserFromAuth]);

  const resolveProfileByIdentifier = useCallback(async (identifierInput: string) => {
    const identifier = identifierInput.trim();
    const normalizedIdentifier = identifier.toLowerCase();

    if (!identifier) {
      throw new Error("Email/Username wajib diisi.");
    }

    if (normalizedIdentifier.includes("@")) {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "id, pair_id, role, name, full_name, photo_url, email, auth_user_id, pair_code_plain, is_owner, birthday, hobbies, bio",
        )
        .eq("email", normalizedIdentifier)
        .limit(10);

      if (error) {
        throw error;
      }

      const profiles = (data || []) as ProfileRow[];
      if (profiles.length === 0) {
        throw new Error("Email tidak ditemukan.");
      }

      if (profiles.length > 1) {
        throw new Error("Email terhubung ke lebih dari satu profile. Gunakan username.");
      }

      return profiles[0];
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, pair_id, role, name, full_name, photo_url, email, auth_user_id, pair_code_plain, is_owner, birthday, hobbies, bio",
      )
      .ilike("name", normalizedIdentifier)
      .limit(10);

    if (error) {
      throw error;
    }

    const profiles = (data || []) as ProfileRow[];
    if (profiles.length === 0) {
      throw new Error("Username tidak ditemukan.");
    }

    if (profiles.length > 1) {
      throw new Error("Username tidak unik. Gunakan email.");
    }

    return profiles[0];
  }, []);

  const loginWithPassword = async (identifierInput: string, password: string) => {
    try {
      const identifier = identifierInput.trim();
      const normalizedIdentifier = identifier.toLowerCase();
      const normalizedPassword = password.trim();

      if (!identifier || !normalizedPassword) {
        throw new Error("Email/Username dan password wajib diisi.");
      }

      let email = "";
      let preferredProfileId = "";

      if (normalizedIdentifier.includes("@")) {
        email = normalizedIdentifier;
      } else {
        const { data: profilesRaw, error: profileLookupError } = await supabase
          .from("user_profiles")
          .select("id, email, name")
          .ilike("name", normalizedIdentifier)
          .not("email", "is", null)
          .limit(10);

        if (profileLookupError) {
          throw profileLookupError;
        }

        const profiles = (profilesRaw || []) as Array<{ id: string; email: string | null; name: string | null }>;
        if (profiles.length === 0) {
          throw new Error("Username tidak ditemukan atau belum punya email terdaftar.");
        }

        if (profiles.length > 1) {
          throw new Error("Username tidak unik. Gunakan email untuk login.");
        }

        email = String(profiles[0].email || "").trim().toLowerCase();
        preferredProfileId = profiles[0].id;
      }

      if (!email) {
        throw new Error("Email tidak ditemukan untuk akun ini.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: normalizedPassword,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Autentikasi gagal. User tidak ditemukan.");
      }

      const userData = await hydrateUserFromAuth(data.user, preferredProfileId || undefined);
      router.push("/dashboard");
      return { success: true, data: userData };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Login gagal." };
    }
  };

  const loginWithPairCode = async (identifierInput: string, pairCodeInput: string) => {
    try {
      const normalizedPairCode = pairCodeInput.trim().toUpperCase();
      if (!normalizedPairCode) {
        throw new Error("Pair code wajib diisi.");
      }

      const selectedProfile = await resolveProfileByIdentifier(identifierInput);
      if (!selectedProfile.pair_id) {
        throw new Error("Akun ini belum terhubung ke pasangan.");
      }

      let isPairCodeValid = false;
      if (selectedProfile.pair_code_plain) {
        isPairCodeValid = selectedProfile.pair_code_plain.trim().toUpperCase() === normalizedPairCode;
      }

      if (!isPairCodeValid) {
        const { data: pairRaw, error: pairError } = await supabase
          .from("pairs")
          .select("pair_code")
          .eq("id", selectedProfile.pair_id)
          .limit(1)
          .maybeSingle();

        if (pairError) {
          throw pairError;
        }

        const pairCodeHash =
          pairRaw && typeof (pairRaw as { pair_code?: unknown }).pair_code === "string"
            ? String((pairRaw as { pair_code?: string }).pair_code)
            : "";

        isPairCodeValid = Boolean(pairCodeHash) && bcrypt.compareSync(normalizedPairCode, pairCodeHash);
      }

      if (!isPairCodeValid) {
        throw new Error("Pair code tidak valid.");
      }

      localStorage.setItem(PROFILE_KEY, selectedProfile.id);
      const sessionData = await buildSessionFromProfile({
        ...selectedProfile,
        pair_code_plain: normalizedPairCode,
      });

      router.push("/dashboard");
      return { success: true, data: sessionData };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Login pair code gagal." };
    }
  };

  const login = (userData: SessionData) => {
    saveSession(userData);
    if (userData?.me?.id) {
      localStorage.setItem(PROFILE_KEY, userData.me.id);
    }
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setUser(null);
    router.push("/login");
  };

  return { user, login, logout, loginWithPassword, loginWithPairCode, updateUser, initializing };
};
