"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./notifikasi.css";

export default function SiswaNotifikasiPage() {
  const [notifikasi, setNotifikasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  // ─── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) { router.replace("/login"); return; }

      const data = await res.json();
      if (!data.user || data.user.role !== "siswa") {
        router.replace("/login");
        return;
      }
      setUserData(data.user);
    };
    init();
  }, [router]);

  // ─── Fetch notif milik siswa ini ─────────────────────────────────────────
  const fetchNotif = async () => {
    if (!userData) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifikasi")
        .select("*")
        .eq("target_role", "siswa")
        .eq("target_nisnip", userData.nisnip)
        .order("created_at", { ascending: false });

      if (error) { setNotifikasi([]); return; }

      const enriched = await Promise.all(
        (data || []).map(async (item) => {
          if (!item.laporan_id) return item;

          const { data: laporan } = await supabase
            .from("laporan_pelanggaran")
            .select("*, jenis_pelanggaran(nama)")
            .eq("id", item.laporan_id)
            .single();

          if (!laporan) return item;

          return {
            ...item,
            deskripsi: laporan.jenis_pelanggaran?.nama ?? "-",
            poin: laporan.poin,
          };
        })
      );

      setNotifikasi(enriched.filter(Boolean));
    } catch (err) {
      console.error(err);
      setNotifikasi([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) fetchNotif();
  }, [userData]);

  // ─── Tandai sudah dibaca ─────────────────────────────────────────────────
  const handleOpenNotif = async (item: any) => {
    if (!item.is_read) {
      await supabase
        .from("notifikasi")
        .update({ is_read: true })
        .eq("id", item.id);
      fetchNotif();
    }
  };

  return (
    <div className="siswa-notif-page">

      {/* ── HEADER ── */}
      <div className="siswa-notif-header">
        <div className="siswa-notif-title">
          <h1>Notifikasi</h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <button className="siswa-notif-back-btn" onClick={() => router.push("/siswa")}>
          <span>‹</span> Kembali
        </button>
      </div>

      {/* ── CARD WRAPPER ── */}
      <div className="siswa-notif-card-wrap">
        {loading ? (
          <p className="siswa-notif-state">Memuat notifikasi...</p>
        ) : notifikasi.length === 0 ? (
          <p className="siswa-notif-state">Belum ada notifikasi.</p>
        ) : (
          notifikasi.map((item, idx) => (
            <div key={item.id}>
              <div
                className={`siswa-notif-item${!item.is_read ? " siswa-notif-item--unread" : ""}`}
                onClick={() => handleOpenNotif(item)}
              >
                {/* Top row: judul + badge */}
                <div className="siswa-notif-top-row">
                  <h3>Notifikasi Pelanggaran</h3>
                  <span className="badge-confirmed">✓ Dikonfirmasi</span>
                </div>

                {/* Info box */}
                <div className="siswa-notif-info-box">
                  <p>
                    Pelanggaran <b>{item.deskripsi}</b> telah dikonfirmasi oleh admin.
                  </p>
                  <p className="siswa-notif-poin">
                    +{item.poin} poin ditambahkan ke akun Anda.
                  </p>
                </div>

                <p className="siswa-notif-timestamp">
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              {idx < notifikasi.length - 1 && (
                <hr className="siswa-notif-divider" />
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}