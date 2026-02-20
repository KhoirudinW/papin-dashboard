import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Preset {
  id: string;
  pair_id: string;
  name: string;
  emojis: string[];
  selected_preset: boolean;
  created_at?: string;
}

export const usePresetReactions = () => {
  const { user } = useAuth();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  const currentPairId = user?.me?.pair_id;
  

  // --- LOGIC FETCH ---
  const fetchPresets = useCallback(async () => {
    if (!currentPairId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('preset_reaction')
        .select('*')
        .eq('pair_id', currentPairId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPresets(data || []);
      
    } catch (err) {
      console.error("Error fetching presets:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPairId]);

  useEffect(() => {
    void fetchPresets();
  }, [fetchPresets]);

  // --- LOGIC CRUD ---
  const addPreset = async (name: string, emojis: string[]) => {
    if (!currentPairId) return { error: new Error("No pair ID found") };
    
    const { data, error } = await supabase
      .from('preset_reaction')
      .insert([{ 
        pair_id: currentPairId, 
        name, 
        emojis, 
        selected_preset: false 
      }])
      .select();
    
    if (!error) fetchPresets();
    return { data, error };
  };

  const updatePreset = async (id: string, name: string, emojis: string[]) => {
    const { error } = await supabase
      .from('preset_reaction')
      .update({ name, emojis })
      .eq('id', id);
    
    if (!error) fetchPresets();
    return { error };
  };

  const deletePreset = async (id: string) => {
    const { error } = await supabase
      .from('preset_reaction')
      .delete()
      .eq('id', id);
    
    if (!error) fetchPresets();
    return { error };
  };

  const selectPreset = async (id: string) => {
    if (!currentPairId) return;
    try {
      // Step A: Reset all to false
      await supabase
        .from('preset_reaction')
        .update({ selected_preset: false })
        .eq('pair_id', currentPairId);

      // Step B: Set target to true
      const { error } = await supabase
        .from('preset_reaction')
        .update({ selected_preset: true })
        .eq('id', id);

      if (!error) fetchPresets();
    } catch (err) {
      console.error("Selection error:", err);
    }
  };

  return { 
    presets, 
    loading, 
    currentPairId, 
    addPreset, 
    updatePreset, 
    deletePreset, 
    selectPreset, 
    refresh: fetchPresets 
  };
};
