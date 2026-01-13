export interface PairWithProfile {
    pair_id: string;
    pair_code: string;
    streak: number;
    last_pap_date: string;
    users: {
      role: string;
      name: string;
      birthday: string;
    }[];
  }