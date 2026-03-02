"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  EyeOff, Eye, Camera, Save, Edit3, Lock, Loader2, Mail, ShieldCheck 
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPerson, faPersonDress } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from "@/hooks/useAuth"; 
import { profileService } from "@/services/profileService";
import { supabase } from "@/lib/supabase"; // Pastikan path ini benar
import NoImage from "@/public/assets/NoImage.png"

interface UserProfile {
  id?: string;
  name?: string;
  full_name?: string;
  birthday?: string;
  hobbies?: string;
  bio?: string;
  photo_url?: string;
  favorite_food?: string;
  favorite_color?: string;
  favorite_song?: string;
  [key: string]: unknown; 
}

type DummyUnpairedProfile = {
  id: string;
  name: string;
  full_name: string;
  role: "A" | "B";
  age: number;
  hobbies: string;
  bio: string;
};

const DUMMY_UNPAIRED_PROFILES: DummyUnpairedProfile[] = [
  {
    id: "DUMMY-001",
    name: "nanda.arti",
    full_name: "Nanda Arti Pratama",
    role: "A",
    age: 25,
    hobbies: "Futsal, Gaming, Kuliner",
    bio: "Santai, suka ngobrol, lagi cari pasangan yang nyambung.",
  },
  {
    id: "DUMMY-002",
    name: "mira.nov",
    full_name: "Mira Novitasari",
    role: "B",
    age: 23,
    hobbies: "Memasak, Film, Traveling",
    bio: "Suka hal sederhana, cari partner yang serius dan suportif.",
  },
  {
    id: "DUMMY-003",
    name: "arya.w",
    full_name: "Arya Wibowo",
    role: "A",
    age: 27,
    hobbies: "Badminton, Musik, Motoran",
    bio: "Open-minded, easygoing, siap kenalan lebih lanjut.",
  },
  {
    id: "DUMMY-004",
    name: "livia.kaa",
    full_name: "Livia Kaavya",
    role: "B",
    age: 24,
    hobbies: "Fotografi, Cafe hopping, Membaca",
    bio: "Suka quality time dan komunikasi yang jujur.",
  },
];

const stringifyHobbies = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  return String(value || "");
};

function ProfileContent() {
  const { user, updateUser, initializing } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const roleParam = searchParams.get('role');
  const activeGender = (roleParam === 'Woman' || roleParam === 'Man') ? roleParam : 'Man';

  const [showPairCode, setShowPairCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false); // Untuk proses saving
  const [fetching, setFetching] = useState(true); // Untuk proses ambil data dari DB
  
  const [pendingPhoto, setPendingPhoto] = useState<{file: File, preview: string} | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [canManageAuthEmail, setCanManageAuthEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailStatusLoading, setEmailStatusLoading] = useState(true);
  const [emailInfoMessage, setEmailInfoMessage] = useState("");
  const [newAuthPassword, setNewAuthPassword] = useState("");
  const [newAuthPasswordConfirm, setNewAuthPasswordConfirm] = useState("");
  const [authCreating, setAuthCreating] = useState(false);

  const [profileData, setProfileData] = useState<{ Man: UserProfile; Woman: UserProfile }>({
    Man: {},
    Woman: {}
  });

  // 1. Fungsi Fetch Data Langsung dari Database
  const fetchLatestData = useCallback(async () => {
    if (!user?.me?.id) {
      setFetching(false);
      return;
    }

    if (!user.me.pair_id) {
      const selfProfile: UserProfile = {
        ...user.me,
        hobbies: stringifyHobbies(user.me.hobbies),
      };

      setProfileData({
        Man: user.me.role === "A" ? selfProfile : {},
        Woman: user.me.role === "B" ? selfProfile : {},
      });
      setFetching(false);
      return;
    }
    
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('pair_id', user.me.pair_id);

      if (error) throw error;

      if (data) {
        const manData = data.find(p => p.role === 'A') || {};
        const womanData = data.find(p => p.role === 'B') || {};
        
        setProfileData({
          Man: manData,
          Woman: womanData
        });
      }
    } catch (err) {
      console.error("Error fetching from DB:", err);
    } finally {
      setFetching(false);
    }
  }, [user?.me]);

  // Trigger fetch saat pertama kali mount atau pair_id tersedia
  useEffect(() => {
    void fetchLatestData();
  }, [fetchLatestData]);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const loadAuthEmailStatus = useCallback(async () => {
    setEmailStatusLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }

      const authUser = data.user;
      const fallbackEmail = String(user?.me?.email || "").trim().toLowerCase();
      if (!authUser) {
        setCanManageAuthEmail(false);
        setAuthEmail(fallbackEmail);
        setEmailInput(fallbackEmail);
        setEmailVerified(null);
        return;
      }

      const currentEmail = String(authUser.email || "").trim().toLowerCase();
      setCanManageAuthEmail(true);
      setAuthEmail(currentEmail || fallbackEmail);
      setEmailInput(currentEmail || fallbackEmail);
      setEmailVerified(Boolean(authUser.email_confirmed_at));
    } catch {
      setCanManageAuthEmail(false);
      setEmailVerified(null);
    } finally {
      setEmailStatusLoading(false);
    }
  }, [user?.me?.email]);

  useEffect(() => {
    void loadAuthEmailStatus();
  }, [loadAuthEmailStatus]);

  const isMyProfile = user?.me?.role === (activeGender === 'Man' ? 'A' : 'B');
  const hasPartner = Boolean(user?.me?.pair_id && user?.partner?.id);
  const showSingleCandidates = !hasPartner && !isMyProfile;
  const filteredSingleCandidates = DUMMY_UNPAIRED_PROFILES.filter((item) => {
    if (user?.me?.role === "A") {
      return item.role === "B";
    }
    if (user?.me?.role === "B") {
      return item.role === "A";
    }
    return true;
  });
  const currentProfile = (() => {
    const selected = profileData[activeGender];
    if (selected && Object.keys(selected).length > 0) {
      return selected;
    }

    if (isMyProfile && user?.me) {
      return {
        ...user.me,
        hobbies: stringifyHobbies(user.me.hobbies),
      } as UserProfile;
    }

    return selected;
  })();
  const hasLinkedAuth = Boolean(user?.me?.auth_user_id);
  const needsAuthSetup = !canManageAuthEmail && !hasLinkedAuth;

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [activeGender]: { ...prev[activeGender], [field]: value }
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert("File maksimal 2MB");
      const previewUrl = URL.createObjectURL(file);
      setPendingPhoto({ file, preview: previewUrl });
    }
  };

  const handleSave = async () => {
    if (!user?.me?.id) return alert("User ID tidak ditemukan");
    setLoading(true);
    
    try {
      let finalPhotoUrl = currentProfile.photo_url;
  
      if (pendingPhoto) {
        if (!user.me.pair_id || !user.me.role) {
          throw new Error("Akun belum terhubung ke pasangan, upload foto belum tersedia.");
        }
        finalPhotoUrl = await profileService.uploadPhoto(
          user.me.pair_id, 
          user.me.role, 
          pendingPhoto.file
        );
      }
  
      const updatedDataForDb = {
        ...currentProfile,
        photo_url: finalPhotoUrl
      };
  
      // Update ke database
      await profileService.updateIndividualProfile(user.me.id, updatedDataForDb);
  
      // Update session lokal useAuth agar Navbar ikut berubah
      updateUser(updatedDataForDb);
  
      alert("Profil berhasil diperbarui!");
      setIsEditing(false);
      setPendingPhoto(null);
      
      // Re-fetch data untuk memastikan UI paling update
      await fetchLatestData();
      router.refresh(); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert("Gagal menyimpan: " + message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPendingPhoto(null);
    fetchLatestData(); // Reset data ke versi database terbaru
  };

  const handleSaveEmail = async () => {
    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailInfoMessage("Email wajib diisi.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailInfoMessage("Format email tidak valid.");
      return;
    }

    if (!user?.me?.id) {
      setEmailInfoMessage("User profile tidak ditemukan.");
      return;
    }

    setEmailSaving(true);
    setEmailInfoMessage("");

    try {
      const { data: authData, error: authGetError } = await supabase.auth.getUser();
      const isMissingSession =
        Boolean(authGetError) &&
        String(authGetError?.message || "").toLowerCase().includes("auth session missing");

      if (authGetError && !isMissingSession) {
        throw authGetError;
      }

      const authUser = isMissingSession ? null : authData.user;
      if (!authUser?.id) {
        const { error: profileOnlyUpdateError } = await supabase
          .from("user_profiles")
          .update({
            email: normalizedEmail,
          })
          .eq("id", user.me.id);

        if (profileOnlyUpdateError) {
          throw profileOnlyUpdateError;
        }

        updateUser({
          email: normalizedEmail,
        });

        setAuthEmail(normalizedEmail);
        setEmailVerified(null);
        setEmailInfoMessage(
          "Email profile berhasil disimpan. Login password belum aktif sampai akun auth terhubung.",
        );

        await fetchLatestData();
        await loadAuthEmailStatus();
        return;
      }

      const currentAuthEmail = String(authUser.email || "").trim().toLowerCase();
      const isSameEmail = currentAuthEmail === normalizedEmail;

      if (!isSameEmail) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          email: normalizedEmail,
        });

        if (authUpdateError) {
          throw authUpdateError;
        }
      }

      const { error: profileUpdateError } = await supabase
        .from("user_profiles")
        .update({
          email: normalizedEmail,
          auth_user_id: authUser.id,
        })
        .eq("id", user.me.id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      updateUser({
        email: normalizedEmail,
        auth_user_id: authUser.id,
      });

      setAuthEmail(normalizedEmail);
      setEmailVerified(isSameEmail ? Boolean(authUser.email_confirmed_at) : false);
      setEmailInfoMessage(
        isSameEmail
          ? "Email profile tersinkron."
          : "Email diupdate. Cek inbox email baru untuk verifikasi.",
      );

      await fetchLatestData();
      await loadAuthEmailStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setEmailInfoMessage(`Gagal update email: ${message}`);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleCreateAuthAccount = async () => {
    const normalizedEmail = emailInput.trim().toLowerCase();
    const normalizedPassword = newAuthPassword.trim();
    const normalizedPasswordConfirm = newAuthPasswordConfirm.trim();

    if (!normalizedEmail) {
      setEmailInfoMessage("Email wajib diisi.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailInfoMessage("Format email tidak valid.");
      return;
    }

    if (normalizedPassword.length < 6) {
      setEmailInfoMessage("Password minimal 6 karakter.");
      return;
    }

    if (normalizedPassword !== normalizedPasswordConfirm) {
      setEmailInfoMessage("Konfirmasi password tidak sama.");
      return;
    }

    if (!user?.me?.id) {
      setEmailInfoMessage("User profile tidak ditemukan.");
      return;
    }

    const normalizedPairCode = String(user.me.pair_code || "").trim().toUpperCase();
    if (!normalizedPairCode) {
      setEmailInfoMessage("Pair code tidak ditemukan. Login ulang pakai pair code lalu coba lagi.");
      return;
    }

    setAuthCreating(true);
    setEmailInfoMessage("");

    try {
      const response = await fetch("/api/auth/link-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: user.me.id,
          email: normalizedEmail,
          password: normalizedPassword,
          pairCode: normalizedPairCode,
        }),
      });

      const payload = (await response.json()) as { message?: string; authUserId?: string; email?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Gagal membuat akun login.");
      }

      updateUser({
        email: normalizedEmail,
        auth_user_id: payload.authUserId || null,
      });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      setNewAuthPassword("");
      setNewAuthPasswordConfirm("");

      if (signInError) {
        setEmailInfoMessage(
          "Akun login berhasil dibuat. Silakan login ulang dengan email/password agar session auth aktif.",
        );
      } else {
        setEmailInfoMessage("Akun login berhasil dibuat dan sekarang sudah terhubung.");
      }

      await fetchLatestData();
      await loadAuthEmailStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setEmailInfoMessage(`Gagal buat akun login: ${message}`);
    } finally {
      setAuthCreating(false);
    }
  };

  if (initializing) {
    return <div className="p-10 text-center font-bold text-primary">Loading Auth Session...</div>;
  }

  if (!user) {
    return (
      <div className="p-10 text-center">
        <p className="font-bold text-primary mb-2">Session tidak ditemukan.</p>
        <p className="text-sm text-gray-500">Silakan login ulang untuk membuka halaman profile.</p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-primary font-bold animate-pulse">Syncing with Database...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
            <h2 className="header-primary-2">Profile</h2>
            {isMyProfile && !isEditing && (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-secondary-hovered transition-all font-bold shadow-sm"
                >
                    <Edit3 size={18} /> Edit Profile
                </button>
            )}
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex gap-3">
            {(['Man', 'Woman'] as const).map((g) => (
              <button 
                key={g}
                disabled={isEditing}
                onClick={() => router.push(`?role=${g}`, { scroll: false })}
                className={`flex flex-col items-center justify-center w-20 h-24 md:w-24 md:h-28 rounded-2xl border-2 transition-all ${
                  activeGender === g 
                  ? g === 'Man' ? 'bg-white border-primary shadow-md' : 'bg-primary border-primary shadow-md'
                  : 'bg-white border-gray-100 opacity-40 hover:opacity-100'
                } ${isEditing ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <FontAwesomeIcon icon={g === 'Man' ? faPerson : faPersonDress} className={`text-2xl ${activeGender === 'Woman' && g === 'Woman' ? "text-white" : "text-primary"}`} />
                <span className={`font-bold mt-2 text-xs md:text-sm ${activeGender === 'Woman' && g === 'Woman' ? "text-white" : "text-primary"}`}>{g}</span>
                {((user.me.role === 'A' && g === 'Man') || (user.me.role === 'B' && g === 'Woman')) && (
                  <span className="text-[9px] bg-secondary text-white px-2 py-0.5 rounded-full mt-1 font-black">SAYA</span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-primary/30 px-5 py-3 rounded-full flex items-center justify-between gap-4 border border-white shadow-sm flex-1 md:flex-none">
            <div className="flex flex-col md:flex-row md:gap-2 select-none">
                <span className="text-primary-hovered font-bold text-xs md:text-base">Pair code :</span>
                <span className="font-mono">{user.me.pair_code ? (showPairCode ? user.me.pair_code : "*******") : "-"}</span>
            </div>
            <button onClick={() => setShowPairCode(!showPairCode)} className="p-1 hover:bg-white/50 rounded-full transition-all">
              {showPairCode ? <Eye size={18} className="text-primary-hovered" /> : <EyeOff size={18} className="text-primary-hovered" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="card-secondary border-gray-50 relative overflow-hidden">
          {isEditing && !isMyProfile && (
             <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-md flex items-center justify-center">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-pink-100 flex flex-col items-center text-center max-w-xs">
                   <Lock size={32} className="text-primary mb-4" />
                   <h3 className="font-black text-gray-700">Akses Terkunci</h3>
                   <p className="text-xs text-gray-400">Kamu hanya bisa mengedit profilmu sendiri.</p>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className={`md:col-span-5 flex flex-col items-center gap-4 ${showSingleCandidates? "hidden" : "block"}`}>
              <div className="relative group w-full max-w-60">
                <img 
                  src={pendingPhoto ? pendingPhoto.preview : (currentProfile.photo_url || NoImage.src)} 
                  alt="Profile" 
                  className={`w-full aspect-3/4 object-cover rounded-3xl shadow-lg border-4 ${pendingPhoto ? 'border-primary' : 'border-secondary'} transition-all`}
                />
                
                {isEditing && isMyProfile && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -top-3 -right-3 bg-primary-hovered p-2.5 rounded-xl text-white shadow-lg hover:scale-110 transition-transform z-10"
                    >
                        <Camera size={20} />
                    </button>
                )}
              </div>
            </div>

            {showSingleCandidates ? (
              <div className="md:col-span-12 space-y-4">
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 font-semibold">
                  Profil pasangan belum tersedia karena akun ini masih single.
                </div>
                <h3 className="text-lg font-black text-primary">Daftar Profile Single</h3>
                <p className="text-xs text-gray-500">
                  Form pasangan digantikan list calon pasangan (dummy data).
                </p>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredSingleCandidates.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-primary text-sm">{item.full_name}</p>
                          <p className="text-xs text-gray-500">@{item.name}</p>
                        </div>
                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-pink-50 text-primary border border-pink-100">
                          {item.role === "A" ? "Man" : "Woman"} • {item.age} th
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-3">
                        <span className="font-bold">Hobi:</span> {item.hobbies}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{item.bio}</p>
                    </div>
                  ))}
                  {filteredSingleCandidates.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 font-semibold">
                      Belum ada kandidat lawan jenis di dummy data.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="md:col-span-7 space-y-5">
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Full Name" value={currentProfile.full_name} onChange={(v: string) => handleInputChange('full_name', v)} />
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Username" value={currentProfile.name} onChange={(v: string) => handleInputChange('name', v)} />
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Birthday" type="date" value={currentProfile.birthday} onChange={(v: string) => handleInputChange('birthday', v)} />
                </div>

                <div className="md:col-span-12 space-y-5">
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Favorite food" value={currentProfile.favorite_food} onChange={(v: string) => handleInputChange('favorite_food', v)} />
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Favorite color" value={currentProfile.favorite_color} onChange={(v: string) => handleInputChange('favorite_color', v)} />
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Favorite song" value={currentProfile.favorite_song} onChange={(v: string) => handleInputChange('favorite_song', v)} />
                    <LabeledInput isEditing={isEditing && isMyProfile} label="Hobbies" value={currentProfile.hobbies} onChange={(v: string) => handleInputChange('hobbies', v)} />
                    <div className="flex flex-col gap-2">
                      <label className="text-primary-hovered font-bold text-sm ml-2">Bio / Message</label>
                      <textarea 
                        disabled={!isEditing || !isMyProfile}
                        value={currentProfile.bio || ''}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className={`w-full p-4 rounded-2xl border-2 outline-none min-h-30 resize-none transition-all ${
                          isEditing && isMyProfile
                          ? 'border-pink-50 bg-white focus:border-primary-hovered text-gray-600 shadow-inner' 
                          : 'border-transparent bg-gray-50 text-gray-400 cursor-not-allowed italic'
                        }`}
                        placeholder="Tulis pesan manis..."
                      />
                    </div>
                </div>
              </>
            )}
          </div>

          {isEditing && isMyProfile && (
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10">
                <button onClick={handleCancel} disabled={loading} className="btn border-2 border-gray-100 px-6 py-3 rounded-2xl font-bold text-gray-400">Cancel</button>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="btn bg-secondary text-white px-8 py-3 rounded-2xl flex flex-row gap-2 items-center font-bold shadow-lg shadow-secondary/20 hover:bg-secondary-hovered disabled:bg-gray-300"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
          )}
        </div>

        <div className="card-secondary h-fit sticky top-6">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8">Role Info</h2>
          <div className="space-y-6">
            <p className="text-gray-500 font-medium">Halo <span className="text-primary font-bold">{user.me.name}</span>, berikut status aksesmu:</p>
            <ul className="space-y-5">
              <TutorialStep number="1" text={`Kamu terdaftar sebagai Role ${user.me.role}.`} />
              <TutorialStep number="2" text={`Akses edit hanya terbuka untuk profil ${user.me.role === 'A' ? 'Man' : 'Woman'}.`} />
              <TutorialStep number="3" text="Data diambil secara real-time dari database pusat." />
            </ul>
          </div>

          <div className="mt-10 pt-8 border-t border-pink-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-primary flex items-center gap-2">
                  <Mail size={18} /> Email Login
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Tambahkan atau ganti email akun dan cek status verifikasi.
                </p>
              </div>
              <button
                onClick={() => void loadAuthEmailStatus()}
                disabled={emailStatusLoading || emailSaving}
                className="text-xs font-bold text-primary hover:underline disabled:text-gray-300"
              >
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                  emailVerified === true
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : emailVerified === false
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                }`}
              >
                {emailVerified === true
                  ? "Terverifikasi"
                  : emailVerified === false
                    ? "Belum Terverifikasi"
                    : "Belum Terhubung Auth"}
              </span>
              {emailVerified === true && <ShieldCheck size={14} className="text-emerald-600" />}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-primary-hovered font-bold text-sm ml-1">Alamat Email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nama@email.com"
                className="w-full p-3 rounded-2xl border-2 border-pink-50 bg-white focus:border-primary-hovered outline-none text-gray-600 shadow-sm"
              />
              <p className="text-[11px] text-gray-500">
                Email saat ini: <span className="font-bold text-primary">{authEmail || "-"}</span>
              </p>
            </div>

            {needsAuthSetup && (
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-primary-hovered font-bold text-sm ml-1">Password Login Baru</label>
                  <input
                    type="password"
                    value={newAuthPassword}
                    onChange={(e) => setNewAuthPassword(e.target.value)}
                    placeholder="minimal 6 karakter"
                    className="w-full p-3 rounded-2xl border-2 border-pink-50 bg-white focus:border-primary-hovered outline-none text-gray-600 shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-primary-hovered font-bold text-sm ml-1">Konfirmasi Password</label>
                  <input
                    type="password"
                    value={newAuthPasswordConfirm}
                    onChange={(e) => setNewAuthPasswordConfirm(e.target.value)}
                    placeholder="ulangi password"
                    className="w-full p-3 rounded-2xl border-2 border-pink-50 bg-white focus:border-primary-hovered outline-none text-gray-600 shadow-sm"
                  />
                </div>
              </div>
            )}

            {!canManageAuthEmail && (
              <p className="text-[11px] text-amber-600 font-semibold">
                {needsAuthSetup
                  ? "Akun ini belum terhubung ke Supabase Auth. Isi email + password untuk membuat akun login."
                  : "Akun auth sudah terhubung. Login dengan email/password untuk mengelola verifikasi email."}
              </p>
            )}

            {emailInfoMessage && (
              <p
                className={`text-[11px] font-semibold ${
                  emailInfoMessage.toLowerCase().startsWith("gagal") ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {emailInfoMessage}
              </p>
            )}

            <button
              type="button"
              onClick={needsAuthSetup ? handleCreateAuthAccount : handleSaveEmail}
              disabled={emailSaving || emailStatusLoading || authCreating}
              className="btn btn-primary-solid w-full py-3 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {authCreating
                ? "Membuat akun..."
                : emailSaving
                  ? "Menyimpan..."
                  : needsAuthSetup
                    ? "Buat Akun Login"
                    : "Simpan Email"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-primary-hovered font-bold text-center">Loading Profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

type LabeledInputProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
  isEditing: boolean;
};

function LabeledInput({ label, value, onChange, type = "text", isEditing }: LabeledInputProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-primary-hovered font-bold text-sm ml-2">{label}</label>
      <input 
        type={type}
        disabled={!isEditing}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 md:p-4 rounded-2xl border-2 transition-all outline-none font-medium ${
            isEditing 
            ? 'border-pink-50 bg-white focus:border-primary-hovered text-gray-600 shadow-sm' 
            : 'border-transparent bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        placeholder={isEditing ? `Masukkan ${label.toLowerCase()}` : ''}
      />
    </div>
  );
}

function TutorialStep({ number, text }: { number: string, text: string }) {
  return (
    <li className="flex gap-4 items-start">
      <span className="bg-primary text-white w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">{number}</span>
      <p className="text-gray-600 text-sm md:text-base leading-relaxed">{text}</p>
    </li>
  );
}


