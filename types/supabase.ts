export interface PairWithProfile {
  pair_id: string;
  pair_code: string;
  streak: number;
  last_pap_date: string | null;
  users: Array<{
    id: string;
    role: string;
    name: string;
    full_name: string;
    photo_url: string | null;
  }>;
  // Tambahkan definisi subscription ini
  subscription?: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    canceled_at: string | null;
    plan: {
      id: string;
      name: string;
      price: number;
      description: string;
      features: Record<string, string | number | boolean>;
    };
  } | null;
}