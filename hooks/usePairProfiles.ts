import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PairWithProfile } from '@/types/supabase';

export function usePairProfiles() {
  const [pairs, setPairs] = useState<PairWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPairs = async () => {
    try {
      setLoading(true);
      // Mengambil data dari view/table pair_with_profiles
      const { data, error: supabaseError } = await supabase
        .from('pair_with_profiles')
        .select('*')
        .order('last_pap_date', { ascending: false });

      if (supabaseError) throw supabaseError;

      setPairs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  // Fungsi untuk refresh data secara manual jika diperlukan
  const refresh = () => fetchPairs();

  return { pairs, loading, error, refresh };
}