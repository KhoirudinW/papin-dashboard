import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { supabase } from "@/lib/supabase";

const AUTH_KEY = 'papin_session';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 1 Hari dalam ms

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const sessionStr = localStorage.getItem(AUTH_KEY);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      const isExpired = Date.now() - session.timestamp > EXPIRATION_TIME;
      
      if (isExpired) {
        localStorage.removeItem(AUTH_KEY);
        router.push('/login');
      } else {
        setUser(session.data);
      }
    }
  }, [router]);

  const login = (userData: any) => {
    const session = {
      timestamp: Date.now(),
      data: userData
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    setUser(userData);
    router.push('/dashboard'); // Alihkan ke halaman aman
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    router.push('/login');
  };

  const updateUser = (newMeData: any) => {
    const sessionStr = localStorage.getItem('papin_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      
      // Susun data baru: gabungkan data lama dengan data baru yang diupdate
      const updatedUserData = {
        ...session.data,
        me: { ...session.data.me, ...newMeData }
      };
  
      const newSession = {
        ...session,
        data: updatedUserData
      };
  
      // Simpan kembali ke localStorage agar saat refresh data tetap ada
      localStorage.setItem('papin_session', JSON.stringify(newSession));
      
      // Update state global agar UI langsung berubah
      setUser(updatedUserData);
    }
  };

  const loginWithHash = async (username: string, pairCodeInput: string) => {
    try {
      // 1. Ambil data pairs untuk pengecekan hash
      const { data: allPairs, error: fetchErr } = await supabase
        .from('pairs')
        .select('id, pair_code');
      
      if (fetchErr) throw fetchErr;
  
      // 2. Cari hash yang cocok
      const matchedPair = allPairs.find(p => 
        bcrypt.compareSync(pairCodeInput.toUpperCase(), p.pair_code)
      );
  
      if (!matchedPair) throw new Error("Pair Code tidak valid.");
  
      // 3. Ambil data profil lengkap dari view
      const { data, error } = await supabase
        .from('pair_with_profiles')
        .select('*')
        .eq('pair_id', matchedPair.id)
        .single();
  
      if (error || !data) throw new Error("Data pasangan tidak ditemukan.");
  
      // 4. Cari profil spesifik user
      const me = data.users.find((u: any) => 
        u.name.toLowerCase() === username.toLowerCase()
      );
  
      if (!me) throw new Error("Username tidak terdaftar di pasangan ini.");
  
      // 5. Susun struktur data agar SAMA dengan fungsi login biasa
      const userData = {
        me: { 
          ...me, 
          pair_id: data.pair_id, 
          pair_code: pairCodeInput.toUpperCase() 
        },
        partner: data.users.find((u: any) => u.role !== me.role) || null,
        streak: data.streak,
        last_pap: data.last_pap_date
      };
  
      // 6. Gunakan logika yang sama dengan fungsi login(userData)
      const session = {
        timestamp: Date.now(),
        data: userData // Membungkus data dalam properti 'data' sesuai standar fungsi login Anda
      };
  
      // Simpan ke localStorage & Update State Global
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      setUser(userData); // Set user dengan userData (bukan session) agar konsisten
      
      router.push('/dashboard');
      return { success: true, data: userData };
  
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { user, login, logout, loginWithHash, updateUser };
};