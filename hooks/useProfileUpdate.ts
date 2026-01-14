import { useState } from 'react';
import { profileService } from '@/services/profileService';

export function useProfileUpdate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const updateProfile = async (userId: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      await profileService.updateIndividualProfile(userId, data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async (userId: string, role: string, file: File) => {
    setUploading(true);
    try {
      const url = await profileService.uploadPhoto(userId, role, file);
      return { success: true, url };
    } catch (err: any) {
      console.error("Upload Error:", err.message);
      return { success: false, message: err.message };
    } finally {
      setUploading(false);
    }
  };

  return { updateProfile, loading, error, handleUploadPhoto, uploading };
}