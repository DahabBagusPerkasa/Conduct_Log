import { supabase } from "@/lib/supabase";

export type SiswaQueryParams = {
  page: number;
  limit: number;
  search: string;
};

export async function getSiswa({ page, limit, search }: SiswaQueryParams) {
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("user")
    .select("nama, nisnip, kelas, role", { count: "exact" });

  if (search) {
    query = query.or(`nama.ilike.%${search}%,nisnip.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
  };
}
