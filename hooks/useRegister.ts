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
    const code = generatePairCode();
    const salt = bcrypt.genSaltSync(10);
    const hashedCode = bcrypt.hashSync(code, salt);

    try {
      // 1. Insert ke tabel pairs
      const { data: pair, error: pairErr } = await supabase
        .from('pairs')
        .insert([{ pair_code: hashedCode, streak: 0 }])
        .select()
        .single();

      if (pairErr) throw pairErr;

      // 2. Persiapkan data profil & Transform hobbies string ke Array
      const usersToInsert = [
        { 
          ...you, 
          pair_id: pair.id, 
          role: you.role,
          hobbies: formatHobbies(you.hobbies) // Transformasi di sini
        },
        { 
          ...partner, 
          pair_id: pair.id, 
          role: partner.role,
          hobbies: formatHobbies(partner.hobbies) // Transformasi di sini
        }
      ];

      // 3. Insert ke user_profiles
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .insert(usersToInsert);

      if (profileErr) throw profileErr;

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