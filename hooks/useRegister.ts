import { useCallback, useEffect, useState } from "react";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export interface ProfileFormData {
  full_name: string;
  name: string;
  birthday: string;
  role: "A" | "B" | "";
  hobbies: string;
  bio: string;
}

export type RegisterMode = "pair_now" | "solo";
export type RegisterAuthStage = "none" | "unverified" | "verified";

type RegisteredProfile = {
  id: string;
  role: "A" | "B";
  pair_id: string | null;
  pair_code_plain?: string | null;
  [key: string]: unknown;
};

type AccountInput = {
  email: string;
  password: string;
};

type CompleteProfileInput = {
  mode: RegisterMode;
  you: ProfileFormData;
  partner?: ProfileFormData | null;
};

type GenericResult = {
  success: boolean;
  error?: string;
};

type AccountResult = GenericResult & {
  requiresEmailConfirmation?: boolean;
};

type CompleteProfileResult = GenericResult & {
  code?: string | null;
};

const AUTH_KEY = "papin_session";
const PROFILE_KEY = "papin_active_profile_id";

const validateEmailFormat = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPlaceholderEmail = (value: string) => value.endsWith("@example.com");

const mapAuthError = (err: unknown, fallback: string) => {
  const message = err instanceof Error ? err.message : String(err || "");
  const lowerMessage = message.toLowerCase();
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code || "")
      : "";
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: number }).status || 0)
      : 0;

  if (lowerMessage.includes('email address') && lowerMessage.includes("invalid")) {
    return 'Email ditolak Supabase. Gunakan email asli (hindari domain contoh seperti "@example.com").';
  }

  if (lowerMessage.includes("user already registered")) {
    return "Email sudah terdaftar. Lanjut login untuk melanjutkan tahap berikutnya.";
  }

  if (lowerMessage.includes("email not confirmed")) {
    return "Email belum diverifikasi. Cek inbox lalu klik link verifikasi.";
  }

  if (lowerMessage.includes("invalid login credentials")) {
    return "Email atau password salah.";
  }

  if (lowerMessage.includes("failed to fetch") || lowerMessage.includes("network")) {
    return "Tidak bisa terhubung ke server. Cek koneksi internet dan konfigurasi Supabase.";
  }

  if (status === 409 || code === "23505") {
    return "Data profile bentrok (409). Pastikan migration terbaru sudah dijalankan.";
  }

  return message || fallback;
};

export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [plainCode, setPlainCode] = useState<string | null>(null);
  const [authStage, setAuthStage] = useState<RegisterAuthStage>("none");
  const [authEmail, setAuthEmail] = useState("");

  const generatePairCode = () => `PAP${Math.floor(100 + Math.random() * 900)}`;

  const formatHobbies = (hobbiesStr: string) => {
    return hobbiesStr
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
  };

  const refreshAuthStage = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      const isMissingSession =
        Boolean(error) &&
        String(error?.message || "").toLowerCase().includes("auth session missing");

      if (error && !isMissingSession) {
        throw error;
      }

      const authUser = isMissingSession ? null : data.user;
      if (!authUser) {
        setAuthStage("none");
        setAuthEmail("");
        return;
      }

      setAuthEmail(String(authUser.email || "").trim().toLowerCase());
      setAuthStage(authUser.email_confirmed_at ? "verified" : "unverified");
    } catch {
      setAuthStage("none");
      setAuthEmail("");
    }
  }, []);

  useEffect(() => {
    void refreshAuthStage();
  }, [refreshAuthStage]);

  const createAuthAccount = async (input: AccountInput): Promise<AccountResult> => {
    setLoading(true);
    setPlainCode(null);

    try {
      const normalizedEmail = input.email.trim().toLowerCase();
      const normalizedPassword = input.password.trim();

      if (!validateEmailFormat(normalizedEmail)) {
        return { success: false, error: "Format email tidak valid." };
      }

      if (isPlaceholderEmail(normalizedEmail)) {
        return {
          success: false,
          error: 'Gunakan email asli. Domain placeholder seperti "@example.com" ditolak Supabase Auth.',
        };
      }

      if (normalizedPassword.length < 6) {
        return { success: false, error: "Password minimal 6 karakter." };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/register/profile`
              : undefined,
        },
      });

      if (error) {
        throw error;
      }

      const requiresEmailConfirmation = !data.session || !data.user?.email_confirmed_at;
      setAuthEmail(normalizedEmail);
      setAuthStage(requiresEmailConfirmation ? "unverified" : "verified");
      await refreshAuthStage();

      return {
        success: true,
        requiresEmailConfirmation,
      };
    } catch (err: unknown) {
      return { success: false, error: mapAuthError(err, "Gagal membuat akun.") };
    } finally {
      setLoading(false);
    }
  };

  const loginForSetup = async (input: AccountInput): Promise<GenericResult> => {
    setLoading(true);
    try {
      const normalizedEmail = input.email.trim().toLowerCase();
      const normalizedPassword = input.password.trim();

      if (!validateEmailFormat(normalizedEmail)) {
        return { success: false, error: "Format email tidak valid." };
      }

      if (!normalizedPassword) {
        return { success: false, error: "Password wajib diisi." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        throw error;
      }

      if (!data.user?.email_confirmed_at) {
        setAuthStage("unverified");
        return {
          success: false,
          error: "Email belum diverifikasi. Selesaikan verifikasi email terlebih dahulu.",
        };
      }

      setAuthEmail(normalizedEmail);
      setAuthStage("verified");
      await refreshAuthStage();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: mapAuthError(err, "Gagal login untuk setup profile.") };
    } finally {
      setLoading(false);
    }
  };

  const completeProfileSetup = async (
    input: CompleteProfileInput,
  ): Promise<CompleteProfileResult> => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const isMissingSession =
        Boolean(authError) &&
        String(authError?.message || "").toLowerCase().includes("auth session missing");

      if (authError && !isMissingSession) {
        throw authError;
      }

      const authUser = isMissingSession ? null : authData.user;
      if (!authUser?.id || !authUser.email) {
        return {
          success: false,
          error: "Login dulu dengan akun yang sudah diverifikasi untuk melanjutkan setup profile.",
        };
      }

      if (!authUser.email_confirmed_at) {
        return { success: false, error: "Email belum diverifikasi." };
      }

      const normalizedEmail = String(authUser.email || "").trim().toLowerCase();

      if (!input.you.name.trim()) {
        return { success: false, error: "Username utama wajib diisi." };
      }

      if (!input.you.role) {
        return { success: false, error: "Gender user pertama wajib dipilih." };
      }

      const { data: existingProfilesRaw, error: existingProfilesError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_user_id", authUser.id)
        .limit(1);

      if (existingProfilesError) {
        throw existingProfilesError;
      }

      if ((existingProfilesRaw || []).length > 0) {
        return { success: false, error: "Akun ini sudah punya profile. Silakan login." };
      }

      if (input.mode === "pair_now") {
        if (!input.partner) {
          return { success: false, error: "Data pasangan wajib diisi untuk mode berdua." };
        }

        if (input.you.role === input.partner.role) {
          return { success: false, error: "Role pasangan tidak boleh sama." };
        }

        const expectedPartnerRole = input.you.role === "A" ? "B" : "A";
        if (input.partner.role !== expectedPartnerRole) {
          return { success: false, error: "Gender pasangan harus kebalikan dari user pertama." };
        }
      }

      let generatedCode: string | null = null;
      let userData: {
        me: Record<string, unknown>;
        partner: Record<string, unknown> | null;
        streak: number;
        last_pap: string | null;
      };

      if (input.mode === "pair_now") {
        let createdPairId: string | null = null;
        const code = generatePairCode();
        const hashedCode = bcrypt.hashSync(code, bcrypt.genSaltSync(10));

        const { data: pair, error: pairErr } = await supabase
          .from("pairs")
          .insert([{ pair_code: hashedCode, streak: 0 }])
          .select()
          .single();

        if (pairErr) {
          throw pairErr;
        }
        createdPairId = pair.id;

        const partnerData = input.partner as ProfileFormData;
        const users = [
          {
            ...input.you,
            pair_id: pair.id,
            hobbies: formatHobbies(input.you.hobbies),
            pair_code_plain: code,
            email: normalizedEmail,
            auth_user_id: authUser.id,
            is_owner: true,
          },
          {
            ...partnerData,
            pair_id: pair.id,
            hobbies: formatHobbies(partnerData.hobbies),
            pair_code_plain: code,
            email: normalizedEmail,
            auth_user_id: null,
            is_owner: false,
          },
        ];

        const { data: profiles, error: profileErr } = await supabase
          .from("user_profiles")
          .insert(users)
          .select();

        if (profileErr) {
          if (createdPairId) {
            await supabase.from("pairs").delete().eq("id", createdPairId);
          }
          throw profileErr;
        }

        const typedProfiles = (profiles || []) as RegisteredProfile[];
        const me =
          typedProfiles.find((p) => p.role === input.you.role) ||
          typedProfiles.find((p) => p.id && p.role) ||
          null;
        const partnerProfile = typedProfiles.find((p) => p.id !== me?.id) || null;

        if (!me) {
          throw new Error("Profil utama tidak ditemukan.");
        }

        userData = {
          me: {
            ...me,
            pair_id: pair.id,
            pair_code: code,
            email: normalizedEmail,
            auth_user_id: authUser.id,
          },
          partner: partnerProfile
            ? {
                ...partnerProfile,
                pair_code: code,
              }
            : null,
          streak: 0,
          last_pap: null,
        };

        generatedCode = code;
      } else {
        const role = input.you.role || "A";

        const { data: profiles, error: profileErr } = await supabase
          .from("user_profiles")
          .insert({
            ...input.you,
            role,
            pair_id: null,
            hobbies: formatHobbies(input.you.hobbies),
            pair_code_plain: null,
            email: normalizedEmail,
            auth_user_id: authUser.id,
            is_owner: true,
          })
          .select()
          .limit(1);

        if (profileErr) {
          throw profileErr;
        }

        const me = ((profiles || [])[0] as RegisteredProfile | undefined) || null;
        if (!me) {
          throw new Error("Profil utama tidak ditemukan.");
        }

        userData = {
          me: {
            ...me,
            pair_id: null,
            pair_code: "",
            email: normalizedEmail,
            auth_user_id: authUser.id,
          },
          partner: null,
          streak: 0,
          last_pap: null,
        };
      }

      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: userData,
        }),
      );

      if (userData.me?.id) {
        localStorage.setItem(PROFILE_KEY, String(userData.me.id));
      }

      setPlainCode(generatedCode);
      setAuthStage("verified");
      setAuthEmail(normalizedEmail);

      return { success: true, code: generatedCode };
    } catch (err: unknown) {
      console.error(err);
      return { success: false, error: mapAuthError(err, "Setup profile gagal.") };
    } finally {
      setLoading(false);
    }
  };

  return {
    createAuthAccount,
    loginForSetup,
    completeProfileSetup,
    refreshAuthStage,
    loading,
    plainCode,
    authStage,
    authEmail,
  };
};
