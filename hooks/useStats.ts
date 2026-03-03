import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface StatsData {
  totalPaps: number;
  totalPresets: number; // Ini akan mengambil dari total_reaction
  currentStreak: number;
  bestStreak: number;
  lastPapDate: string | null;
}

export const useStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    totalPaps: 0,
    totalPresets: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPapDate: null,
  });

  const pairId = user?.me?.pair_id;

  const fetchStats = useCallback(async () => {
    if (!pairId) {
      setStats({
        totalPaps: 0,
        totalPresets: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPapDate: null,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Mengambil data langsung dari table pair_stats
      const { data, error } = await supabase
        .from('pair_stats')
        .select('total_pap, total_reaction, streak_current, streak_best, last_pap_date')
        .eq('pair_id', pairId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats({
          totalPaps: data.total_pap || 0,
          totalPresets: data.total_reaction || 0,
          currentStreak: data.streak_current || 0,
          bestStreak: data.streak_best || 0,
          lastPapDate: data.last_pap_date || null,
        });
      } else {
        setStats({
          totalPaps: 0,
          totalPresets: 0,
          currentStreak: 0,
          bestStreak: 0,
          lastPapDate: null,
        });
      }
    } catch (err) {
      console.error("Stats Error:", err);
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { ...stats, loading, refresh: fetchStats };
};
