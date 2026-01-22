import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type ViewType = "weekly" | "yearly";

interface ChartItem {
  display: string;
  pap: number;
  reaction: number;
}

export const useDataChart = () => {
  const { user } = useAuth();

  const [viewType, setViewType] = useState<ViewType>("weekly");
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      const pairId = user?.me?.pair_id;

      if (!pairId) {
        if (isMounted) {
          setChartData([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const table = viewType === "weekly" ? "weekly_stats" : "yearly_stats";
      const orderField = viewType === "weekly" ? "week_start" : "year";

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("pair_id", pairId)
        .order(orderField, { ascending: false }) // ambil data terbaru
        .limit(12);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setChartData([]);
      } else if (data) {
        const formatted: ChartItem[] = data
          .reverse() // dibalik agar chart tetap kronologis
          .map((item: any) => ({
            display:
              viewType === "weekly"
                ? new Date(item.week_start).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })
                : String(item.year),
            pap: item.pap_count ?? 0,
            reaction: item.reaction_count ?? 0,
          }));

        setChartData(formatted);
      }

      setLoading(false);
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user?.me?.pair_id, viewType]);

  return {
    viewType,
    setViewType,
    chartData,
    loading,
    error,
  };
};
