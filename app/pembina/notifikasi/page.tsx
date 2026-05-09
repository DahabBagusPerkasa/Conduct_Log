"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./notifikasi.css";

export default function PembinaNotifikasiPage() {
  const [notifikasi, setNotifikasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ─── Fetch notifikasi milik pembina ──────────────────────────────────────
  const fetchNotifList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifikasi")
        .select("*")
        .eq("target_role", "pembina")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("FETCH NOTIF PEMBINA ERROR:", error);
        setNotifikasi([]);
        return;
      }

      // Enrich: ambil detail laporan jika ada laporan_id
      const enriched = await Promise.all(
        data.map(async (item) => {
          if (!item.laporan_id) return item;

          const { data: laporan } = await supabase
            .from("laporan_pelanggaran")
            .select("*, jenis_pelanggaran(nama)")
            .eq("id", item.laporan_id)
            .single();

          if (!laporan) return item;

          const { data: siswa } = await supabase
            .from("user")
            .select("nama")
            .eq("nisnip", laporan.nisnip)
            .single();

          return {
            ...item,
            namaSiswa: siswa?.nama ?? laporan.nisnip,
            deskripsi: laporan.jenis_pelanggaran?.nama ?? "-",
            poin: laporan.poin,
            alasanPenolakan: laporan.alasan_penolakan ?? null,
            statusLaporan: laporan.status,
          };
        })
      );

      setNotifikasi(enriched);
    } catch (err) {
      console.error(err);
      setNotifikasi([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Tandai sudah dibaca ─────────────────────────────────────────────────
  const handleOpenNotif = async (item: any) => {
    if (!item.is_read) {
      await supabase
        .from("notifikasi")
        .update({ is_read: true })
        .eq("id", item.id);
      fetchNotifList();
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  };

  useEffect(() => {
    fetchNotifList();
  }, []);

  // ─── Badge tipe notif ────────────────────────────────────────────────────
  const TipeBadge = ({ tipe }: { tipe: string }) => {
    if (tipe === "accepted")
      return <span className="badge badge-accepted">✓ Diterima Admin</span>;
    if (tipe === "rejected")
      return <span className="badge badge-rejected">✕ Ditolak Admin</span>;
    return <span className="badge badge-pending">⏳ Menunggu</span>;
  };

  return (
    <div className="notif-page">
      {/* ── HEADER ── */}
      <div className="notif-page-header">
        <div className="notif-page-title">
          <h1>Notifikasi</h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <button className="notif-back-btn" onClick={() => router.push("/pembina")}>
          <span>‹</span> Kembali
        </button>
      </div>

      {/* ── CARD WRAPPER ── */}
      <div className="notif-card-wrap">
        {loading ? (
          <p className="notif-state-text">Memuat notifikasi...</p>
        ) : notifikasi.length === 0 ? (
          <p className="notif-state-text">Belum ada notifikasi.</p>
        ) : (
          notifikasi.map((item, idx) => (
            <div key={item.id}>
              <div
                className={`notif-item${!item.is_read ? " notif-item--unread" : ""}`}
                onClick={() => handleOpenNotif(item)}
              >
                {/* Baris atas: label + badge tipe */}
                <div className="notif-item-top-row">
                  <p className="notif-sender-label">Dari Admin</p>
                  <TipeBadge tipe={item.tipe ?? "pending"} />
                </div>

                <div className="notif-row">
                  {/* Kiri: avatar admin */}
                  <div className="notif-left">
                    <div className="notif-avatar notif-avatar--admin">ADM</div>
                    <div>
                      <p className="notif-sender-name">Admin</p>
                      <p className="notif-sender-role">Kesiswaan</p>
                    </div>
                  </div>

                  {/* Kanan: detail laporan */}
                  <div className="notif-right">
                    {item.namaSiswa && (
                      <div className="notif-info-row">
                        <span className="notif-siswa-name">{item.namaSiswa}</span>
                        {item.poin && (
                          <span className="notif-poin-badge">{item.poin} poin</span>
                        )}
                        <span className="notif-desc">{item.deskripsi}</span>
                      </div>
                    )}

                    {/* Jika rejected: tampilkan alasan penolakan */}
                    {item.tipe === "rejected" && (
                      <div className="notif-alasan-box">
                        <p className="notif-alasan-label">Alasan Penolakan:</p>
                        <p className="notif-alasan-text">
                          {item.message || item.alasanPenolakan || "-"}
                        </p>
                      </div>
                    )}

                    {/* Jika accepted: pesan konfirmasi */}
                    {item.tipe === "accepted" && (
                      <p className="notif-accepted-text">
                        Laporan pelanggaran telah dikonfirmasi oleh admin.
                      </p>
                    )}
                  </div>
                </div>

                <p className="notif-timestamp">
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              {idx < notifikasi.length - 1 && <hr className="notif-divider" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}