import { supabase } from "@/lib/supabase";

export const profileService = {
  async updateIndividualProfile(userId: string, updatedData: any) {
    // Buang field yang tidak ada di tabel user_profiles
    const { id, created_at, pair_id, pair_code, role, streak, last_pap, users, ...validData } = updatedData;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(validData)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data;
  },

  async uploadPhoto(userId: string, role: string, file: File) {
    // Path: PAPimage/profile_photos/{id user}/{role}.jpg
    const filePath = `profile-photos/${userId}/${role.toUpperCase()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('PAPimage')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('PAPimage').getPublicUrl(filePath);
    return `${data.publicUrl}?t=${Date.now()}`; // Anti-cache
  }
};