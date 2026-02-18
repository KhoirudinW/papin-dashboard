import { useAuth } from "./useAuth";
import { usePairProfiles } from "./usePairProfiles";
import type { PairWithProfile } from "@/types/supabase";

const INITIAL_RENDER_TIME_MS = Date.now();

export const useSubscription = () => {
  const { user } = useAuth(); // Ambil pair_id dari auth
  const { pairs, loading: pairLoading } = usePairProfiles();

  // Cari data pair yang spesifik berdasarkan pair_id di useAuth
  const myPairData = pairs.find((pair: PairWithProfile) => pair.pair_id === user?.me?.pair_id);

  // Ambil data subscription dari pair yang ditemukan
  const subscription = myPairData?.subscription;
  const hasValidStatus = subscription?.status === "active";

  const endTime = subscription?.end_date ? new Date(subscription.end_date).getTime() : null;
  const hasEndDate = typeof endTime === "number" && !Number.isNaN(endTime);
  const isWithinEndDate = !hasEndDate || (endTime as number) > INITIAL_RENDER_TIME_MS;

  const isSubscriptionActive = Boolean(hasValidStatus && isWithinEndDate);
  const normalizedPlanName = subscription?.plan?.name?.toLowerCase() || "basic";

  // Logic penentuan status Premium/Pro
  const isPremium =
    isSubscriptionActive && (normalizedPlanName === "pro" || normalizedPlanName === "premium");

  let daysRemaining = 0;
  if (hasEndDate) {
    daysRemaining = Math.max(
      0,
      Math.ceil(((endTime as number) - INITIAL_RENDER_TIME_MS) / (1000 * 3600 * 24)),
    );
  }

  return {
    isPremium,
    planName: isSubscriptionActive ? subscription?.plan?.name || "basic" : "basic",
    features: subscription?.plan?.features || {},
    daysRemaining,
    loading: pairLoading,
  };
};
