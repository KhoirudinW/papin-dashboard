"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  EyeOff, 
  Eye, 
  Camera, 
  ChevronDown, 
  Save, 
  Edit3,
  Lock
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPerson, faPersonDress } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from "@/hooks/useAuth"; 
import { supabase } from "@/lib/supabase";

// Interface untuk memastikan TypeScript tidak error saat spread
interface UserProfile {
  name?: string;
  role?: string;
  birthday?: string;
  hobbies?: string;
  bio?: string;
  image?: string;
  pair_code?: string;
  pair_id?: string;
  [key: string]: any; 
}

function ProfileContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roleParam = searchParams.get('role');
  const activeGender = (roleParam === 'Woman' || roleParam === 'Man') ? roleParam : 'Man';

  const [showPairCode, setShowPairCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tambahkan di dalam ProfileContent
  useEffect(() => {
    // Jika tidak ada parameter role di URL, arahkan otomatis berdasarkan role user
    if (!roleParam && user?.me?.role) {
      const defaultRole = user.me.role === 'A' ? 'Man' : 'Woman';
      router.replace(`?role=${defaultRole}`, { scroll: false });
    }
  }, [roleParam, user, router]);

  // Perbaikan Error TS 2451: Hanya satu deklarasi profileData di sini
  const [profileData, setProfileData] = useState<{ Man: UserProfile; Woman: UserProfile }>({
    Man: {},
    Woman: {}
  });

  // Sinkronisasi data dari session ke state lokal
  useEffect(() => {
    if (user && user.me) {
      // Role A selalu di kolom Man, Role B selalu di kolom Woman
      const dataA = user.me.role === 'A' ? user.me : (user.partner || {});
      const dataB = user.me.role === 'B' ? user.me : (user.partner || {});

      setProfileData({
        Man: { ...dataA },
        Woman: { ...dataB }
      });
    }
  }, [user]);

  const currentProfile = profileData[activeGender];

  // Cek kepemilikan profil (Role A = Man, Role B = Woman)
  const isMyProfile = user?.me?.role === (activeGender === 'Man' ? 'A' : 'B');

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [activeGender]: { 
        ...(prev[activeGender] as object), 
        [field]: value 
      }
    }));
  };

  const handleSave = async () => {
    if (!user?.me?.pair_id) return;
    setLoading(true);
    try {
      // 1. Ambil data users terbaru dari DB
      const { data: pairData, error: fetchErr } = await supabase
        .from('pair_with_profiles')
        .select('users')
        .eq('pair_id', user.me.pair_id)
        .single();

      if (fetchErr) throw fetchErr;

      // 2. Update array users: cari yang rolenya sama dengan saya, ganti dengan currentProfile
      const updatedUsers = pairData.users.map((u: any) => 
        u.role === user.me.role ? { ...currentProfile } : u
      );

      // 3. Simpan kembali ke Supabase
      const { error: updateErr } = await supabase
        .from('pair_with_profiles')
        .update({ users: updatedUsers })
        .eq('pair_id', user.me.pair_id);

      if (updateErr) throw updateErr;
      
      alert("Profil berhasil diperbarui!");
      setIsEditing(false);
      // Opsi: window.location.reload() jika ingin refresh session dari localStorage
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center font-bold text-primary">Loading Auth Session...</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      
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
                } ${isEditing ? 'cursor-not-allowed' : ''}`}
              >
                <FontAwesomeIcon 
                  icon={g === 'Man' ? faPerson : faPersonDress} 
                  className={`text-2xl ${activeGender === 'Woman' && g === 'Woman' ? "text-white" : "text-primary"}`}
                />
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
                {
                  showPairCode ? 
                  user.me.pair_code : 
                  "•".repeat(user.me.pair_code?.length || 7)
                }
            </div>
            <button onClick={() => setShowPairCode(!showPairCode)} className="p-1 hover:bg-white/50 rounded-full transition-all">
              {showPairCode ? <Eye size={18} className="text-primary-hovered" /> : <EyeOff size={18} className="text-primary-hovered" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* FORM EDITOR CARD */}
        <div className="card-secondary border-gray-50 relative overflow-hidden">
          {/* Lock Overlay jika paksa edit profil pasangan */}
          {isEditing && !isMyProfile && (
             <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-md flex items-center justify-center">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-pink-100 flex flex-col items-center text-center max-w-xs">
                   <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-primary mb-4">
                      <Lock size={32} />
                   </div>
                   <h3 className="font-black text-gray-700 mb-2">Akses Terkunci</h3>
                   <p className="text-xs text-gray-400 font-medium">Kamu hanya diizinkan mengelola profil pribadimu sendiri.</p>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-5 flex flex-col items-center gap-4">
              <div className="relative group">
                <img src={currentProfile.photo_url || "https://i.pravatar.cc/150"} alt="Profile" width={300} height={300} className="w-full max-w-45 md:max-w-full aspect-3/4 object-cover rounded-3xl shadow-lg border-4 border-secondary" />
                {isEditing && isMyProfile && (
                    <button className="absolute -top-3 -right-3 bg-primary-hovered p-2.5 rounded-xl text-white shadow-lg hover:scale-110 transition-transform">
                        <Camera size={20} />
                    </button>
                )}
              </div>
            </div>

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
                    value={currentProfile.bio || currentProfile.message || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className={`w-full p-4 rounded-2xl border-2 outline-none min-h-30 resize-none transition-all ${
                      isEditing && isMyProfile
                      ? 'border-pink-50 bg-white focus:border-primary-hovered text-gray-600 shadow-inner' 
                      : 'border-transparent bg-gray-50 text-gray-400 cursor-not-allowed italic'
                    }`}
                    placeholder="Tulis pesan manis untuk pasanganmu..."
                  />
                </div>
            </div>
          </div>

          {isEditing && isMyProfile && (
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10">
                <button onClick={() => setIsEditing(false)} className="btn btn-secondary-stroke px-6">Cancel</button>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="btn btn-secondary-solid flex flex-row gap-2 items-center"
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
          )}
        </div>

        {/* INFO CARD */}
        <div className="card-secondary h-fit sticky top-6">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8">Role Info</h2>
          <div className="space-y-6">
            <p className="text-gray-500 font-medium">Halo <span className="text-primary font-bold">{user.me.name}</span>, berikut status aksesmu:</p>
            <ul className="space-y-5">
              <TutorialStep number="1" text={`Kamu terdaftar sebagai Role ${user.me.role}.`} />
              <TutorialStep number="2" text={`Akses edit hanya terbuka untuk profil ${user.me.role === 'A' ? 'Man' : 'Woman'}.`} />
              <TutorialStep number="3" text="Data yang kamu simpan akan langsung terlihat oleh pasanganmu." />
              <TutorialStep number="4" text="Gunakan Pair Code di atas untuk mengundang atau memverifikasi akun." />
            </ul>
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

// Sub-komponen Input
function LabeledInput({ label, value, onChange, type = "text", isEditing }: any) {
  return (
    <div className="flex flex-col gap-2 w-full transition-all">
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
      <span className="bg-primary text-white w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
        {number}
      </span>
      <p className="text-gray-600 text-sm md:text-base leading-relaxed">{text}</p>
    </li>
  );
}