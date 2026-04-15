import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useKasus({ search, activeMenu }: { search: string; activeMenu: string }) {
  const [dataKasus, setDataKasus] = useState<any[]>([]);
  const [loadingKasus, setLoadingKasus] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const fetchKasus = useCallback(async () => {
    setLoadingKasus(true);

    try {
      const baseQuery = supabase
        .from("pelanggaran")
        .select(`
          id,
          poin,
          bukti,
          created_at,
          user:user_id (nisnip, nama, kelas),
          jenis_pelanggaran:jenis_id (id, nama)
        `)
        .order("created_at", { ascending: false });

      let response: any;
      const queryValue = debouncedSearch.trim();

      response = await baseQuery;

      if (queryValue && !response.error) {
        const searchLower = queryValue.toLowerCase();
        response.data = (response.data || []).filter((item: any) =>
          item.user?.nama?.toLowerCase().includes(searchLower) ||
          item.user?.nisnip?.toLowerCase().includes(searchLower) ||
          item.jenis_pelanggaran?.nama?.toLowerCase().includes(searchLower)
        );
      }

      if (response.error) {
        console.error("SUPABASE KASUS ERROR:", response.error.message);
        setDataKasus([]);
        return;
      }

      const mappedData = (response.data || []).map((item: any) => ({
        id: item.id,
        nama: item.user?.nama || "-",
        nisnip: item.user?.nisnip || "-",
        kelas: item.user?.kelas || "-",
        jenis: item.jenis_pelanggaran?.nama || "-",
        poin: item.poin,
        created_at: item.created_at,
        user: item.user,
        jenis_pelanggaran: item.jenis_pelanggaran,
      }));

      setDataKasus(mappedData);
    } catch (error) {
      console.error("FETCH KASUS ERROR:", error);
      setDataKasus([]);
    } finally {
      setLoadingKasus(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (activeMenu === "kasus" || debouncedSearch) {
      fetchKasus();
    }
  }, [activeMenu, debouncedSearch, fetchKasus]);

  return {
    dataKasus,
    loadingKasus,
    fetchKasus,
  };
}
