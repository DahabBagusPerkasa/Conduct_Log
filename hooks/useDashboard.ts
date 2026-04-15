import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useDashboard() {
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [sp1, setSp1] = useState(0);
  const [sp2, setSp2] = useState(0);
  const [tindakLanjut, setTindakLanjut] = useState(0);

  const fetchDashboard = useCallback(async () => {
    const { count } = await supabase
      .from("user")
      .select("*", { count: "exact", head: true });

    setTotalSiswa(count || 0);

    const { data: pelanggaran, error } = await supabase
      .from("pelanggaran")
      .select(`
        poin,
        user:user_id (nisnip)
      `);

    if (!pelanggaran || error) return;

    const mapPoin: Record<string, number> = {};

    pelanggaran.forEach((item: any) => {
      const nisnip = item.user?.nisnip;
      if (!nisnip) return;

      if (!mapPoin[nisnip]) {
        mapPoin[nisnip] = 0;
      }
      mapPoin[nisnip] += item.poin;
    });

    let sp1Count = 0;
    let sp2Count = 0;
    let tindakCount = 0;

    Object.values(mapPoin).forEach((total) => {
      if (total >= 150) tindakCount++;
      else if (total >= 100) sp2Count++;
      else if (total >= 50) sp1Count++;
    });

    setSp1(sp1Count);
    setSp2(sp2Count);
    setTindakLanjut(tindakCount);
  }, []);

  useEffect(() => {
    fetchDashboard();

    let channel: any;
    channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelanggaran",
        },
        () => {
          fetchDashboard();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchDashboard]);

  return {
    totalSiswa,
    sp1,
    sp2,
    tindakLanjut,
    fetchDashboard,
  };
}
