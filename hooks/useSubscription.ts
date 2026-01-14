import { useAuth } from './useAuth';
import { usePairProfiles } from './usePairProfiles';

export const useSubscription = () => {
  const { user } = useAuth(); // Ambil pair_id dari auth
  const { pairs, loading: pairLoading } = usePairProfiles();

  // Cari data pair yang spesifik berdasarkan pair_id di useAuth
  const myPairData = pairs.find((p: any) => p.pair_id === user?.me?.pair_id);

  // Ambil data subscription dari pair yang ditemukan
  const subscription = myPairData?.subscription;
  
  // Logic penentuan status Premium/Pro
  const isPremium = subscription?.status === 'active' && 
                    (subscription?.plan?.name.toLowerCase() === 'pro' || 
                     subscription?.plan?.name.toLowerCase() === 'premium');

                     console.log(myPairData);
                     
  return {
    isPremium,
    planName: subscription?.plan?.name || 'basic',
    features: subscription?.plan?.features || {},
    // Memberikan info sisa hari jika diperlukan untuk UI
    daysRemaining: subscription?.end_date 
      ? Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 3600 * 24)) 
      : 0,
    loading: pairLoading
  };
};