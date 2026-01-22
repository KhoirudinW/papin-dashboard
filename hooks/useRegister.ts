import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export interface ProfileFormData {
  full_name: string;
  name: string;
  birthday: string;
  role: 'A' | 'B' | '';
  hobbies: string; // Di form tetap string agar mudah diketik
  bio: string;
}

export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [plainCode, setPlainCode] = useState<string | null>(null);

  const generatePairCode = () => `PAP${Math.floor(100 + Math.random() * 900)}`;

  // Fungsi helper untuk merubah string "Coding, Game" menjadi ["Coding", "Game"]
  const formatHobbies = (hobbiesStr: string) => {
    return hobbiesStr
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== ""); // Menghapus string kosong jika ada koma di akhir
  };

  const registerPairs = async (you: ProfileFormData, partner: ProfileFormData) => {
    setLoading(true);
  
    if (you.role === partner.role) {
      setLoading(false);
      return { success: false, error: 'Role pasangan tidak boleh sama' };
    }
  
    const code = generatePairCode();
    const hashedCode = bcrypt.hashSync(code, bcrypt.genSaltSync(10));
  
    try {
      // 1. Insert pair
      const { data: pair, error: pairErr } = await supabase
        .from('pairs')
        .insert([{ pair_code: hashedCode, streak: 0 }])
        .select()
        .single();
  
      if (pairErr) throw pairErr;
  
      // 2. Insert profiles
      const users = [
        { ...you, pair_id: pair.id, hobbies: formatHobbies(you.hobbies) },
        { ...partner, pair_id: pair.id, hobbies: formatHobbies(partner.hobbies) }
      ];
  
      const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .insert(users)
        .select();
  
      if (profileErr) throw profileErr;
  
      // 3. Build session (AUTO LOGIN)
      const me = profiles.find((p: any) => p.role === you.role);
      const partnerProfile = profiles.find((p: any) => p.role !== you.role);
  
      if (!me) throw new Error('Profil utama tidak ditemukan');
  
      const userData = {
        me: {
          ...me,
          pair_id: pair.id,
          pair_code: code
        },
        partner: partnerProfile || null,
        streak: 0,
        last_pap: null
      };
  
      const session = {
        timestamp: Date.now(),
        data: userData
      };
  
      localStorage.setItem('papin_session', JSON.stringify(session));
  
      setPlainCode(code);
      return { success: true, code };
  
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  

  return { registerPairs, loading, plainCode };
};