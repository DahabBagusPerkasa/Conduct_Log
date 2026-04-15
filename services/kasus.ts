import { supabase } from "@/lib/supabase";

export type KasusQueryParams = {
  page: number;
  limit: number;
  search: string;
};

export async function getKasus({ page, limit, search }: KasusQueryParams) {
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("pelanggaran")
    .select(
      `
        id,
        nisnip,
        poin,
        user ( nama, kelas ),
        jenis_pelanggaran ( nama )
      `,
      { count: "exact" }
    );

  if (search) {
    query = query.or(`nisnip.ilike.%${search}%,user.nama.ilike.%${search}%`);
  }

  const result = await query.order("created_at", { ascending: false }).range(from, to);

  if (result.error) {
    throw result.error;
  }

  return {
    data: result.data || [],
    count: result.count || 0,
  };
}
