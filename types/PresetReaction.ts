interface PresetReaction {
    id: string;
    pair_id: string;
    name: string;
    emojis: string[]; // text[] di database
    selected_preset: boolean;
    created_at: string;
  }