import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSiswa } from "@/services/siswa";

export function useSiswa({ search, activeMenu, limit }: { search: string; activeMenu: string; limit: number }) {
  const [dataSiswa, setDataSiswa] = useState<any[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [pageSiswa, setPageSiswa] = useState(0);
  const [totalSiswaData, setTotalSiswaData] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const fetchSiswaNormal = useCallback(async () => {
    setLoadingSiswa(true);

    try {
      const result = await getSiswa({
        page: pageSiswa,
        limit,
        search: "",
      });

      setDataSiswa(result.data);
      setTotalSiswaData(result.count);
    } catch (error) {
      console.error("FETCH SISWA NORMAL ERROR:", error);
      setDataSiswa([]);
      setTotalSiswaData(0);
    } finally {
      setLoadingSiswa(false);
    }
  }, [pageSiswa, limit]);

  const fetchSiswaSearch = useCallback(async () => {
    setLoadingSiswa(true);

    try {
      let query = supabase
        .from("user")
        .select("nama, nisnip, kelas, role")
        .limit(6);

      if (debouncedSearch) {
        query = query.or(
          `nama.ilike.%${debouncedSearch}%,nisnip.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("FETCH SISWA SEARCH ERROR:", error);
        setDataSiswa([]);
        setTotalSiswaData(0);
        return;
      }

      setDataSiswa(data || []);
      setTotalSiswaData((data || []).length);
    } catch (err) {
      console.error("UNEXPECTED SISWA SEARCH ERROR:", err);
      setDataSiswa([]);
      setTotalSiswaData(0);
    } finally {
      setLoadingSiswa(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPageSiswa(0);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch) {
      fetchSiswaSearch();
    } else if (activeMenu === "siswa") {
      fetchSiswaNormal();
    }
  }, [activeMenu, debouncedSearch, fetchSiswaNormal, fetchSiswaSearch]);

  return {
    dataSiswa,
    loadingSiswa,
    totalSiswaData,
    pageSiswa,
    setPageSiswa,
    fetchSiswa: debouncedSearch ? fetchSiswaSearch : fetchSiswaNormal,
  };
}
