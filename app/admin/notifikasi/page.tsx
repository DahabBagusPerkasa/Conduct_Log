"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./notifikasi.css";

export default function AdminNotifikasiPage() {
  const [notifikasi, setNotifikasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State untuk modal penolakan
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any>(null); // item notif yg akan ditolak
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [loadingReject, setLoadingReject] = useState(false);

  // ─── Fetch semua notifikasi ───────────────────────────────────────────────
  const fetchNotifList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifikasi")
        .select("*")
        .eq("target_role", "admin")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("FETCH NOTIF LIST ERROR:", error);
        setNotifikasi([]);
        return;
      }

      const enriched = await Promise.all(
        data.map(async (item) => {
          if (!item.laporan_id) return item;

          // Ambil laporan + jenis pelanggaran
          const { data: laporan, error: laporanError } = await supabase
            .from("laporan_pelanggaran")
            .select("*, jenis_pelanggaran(nama)")
            .eq("id", item.laporan_id)
            .single();

          if (laporanError || !laporan) return item;

          // Nama siswa yang dilaporkan
          const { data: siswa } = await supabase
            .from("user")
            .select("nama")
            .eq("nisnip", laporan.nisnip)
            .single();

          // Nama pengirim (pembina) via sender_nisnip atau pelapor_nisnip
          const pengirimNisnip = item.sender_nisnip || laporan.pelapor_nisnip;
          const { data: pengirim } = await supabase
            .from("user")
            .select("nama, role")
            .eq("nisnip", pengirimNisnip)
            .single();

          return {
            ...item,
            tipe: item.tipe || "laporan",
            namaSiswa: siswa?.nama ?? laporan.nisnip,
            namaPengirim: pengirim?.nama ?? "Tidak diketahui",
            rolePengirim: pengirim?.role ?? "pembina",
            poin: laporan.poin,
            deskripsi: laporan.jenis_pelanggaran?.nama ?? "-",
            statusLaporan: laporan.status,
            laporan,
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

  // ─── Accept laporan ───────────────────────────────────────────────────────
  const acceptLaporan = async (item: any) => {
    const laporan = item.laporan;

    // 1. Cari user_id siswa dari nisnip
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id")
      .eq("nisnip", laporan.nisnip)
      .single();

    if (userError || !user) {
      alert("Siswa tidak ditemukan!");
      return;
    }

    // 2. Insert ke tabel pelanggaran
    const { error: insertError } = await supabase.from("pelanggaran").insert({
      user_id: user.id,
      jenis_id: laporan.jenis_id,
      poin: laporan.poin,
      bukti: laporan.bukti ?? null,
      keterangan: laporan.keterangan ?? null,
    });

    if (insertError) {
      console.error(insertError);
      alert("Gagal menerima laporan!");
      return;
    }

    // 3. Update status laporan → accepted
    await supabase
      .from("laporan_pelanggaran")
      .update({ status: "accepted" })
      .eq("id", laporan.id);

    // 4. Notif ke SISWA yang bersangkutan
    await supabase.from("notifikasi").insert({
      target_role: "siswa",
      tipe: "accepted",
      message: `Pelanggaran Anda (${item.deskripsi}) telah dikonfirmasi. Poin: ${laporan.poin}`,
      is_read: false,
      laporan_id: laporan.id,
      sender_nisnip: null, // dari sistem/admin
    });

    // 5. Notif ke PEMBINA bahwa laporannya diterima
    await supabase.from("notifikasi").insert({
      target_role: "pembina",
      tipe: "accepted",
      message: `Laporan pelanggaran ${item.namaSiswa} telah diterima oleh admin.`,
      is_read: false,
      laporan_id: laporan.id,
      sender_nisnip: null,
    });

    // 6. Tandai notif ini sudah dibaca
    await supabase
      .from("notifikasi")
      .update({ is_read: true })
      .eq("id", item.id);

    alert("Laporan diterima!");
    fetchNotifList();
  };

  // ─── Buka modal reject ────────────────────────────────────────────────────
  const openRejectModal = (item: any) => {
    setRejectTarget(item);
    setAlasanPenolakan("");
    setShowRejectModal(true);
  };

  // ─── Confirm reject ───────────────────────────────────────────────────────
  const confirmReject = async () => {
    if (!alasanPenolakan.trim()) {
      alert("Harap isi alasan penolakan!");
      return;
    }

    setLoadingReject(true);
    const item = rejectTarget;
    const laporan = item.laporan;

    try {
      // 1. Update status laporan → rejected + simpan alasan
      const { error } = await supabase
        .from("laporan_pelanggaran")
        .update({
          status: "rejected",
          alasan_penolakan: alasanPenolakan.trim(),
        })
        .eq("id", laporan.id);

      if (error) throw error;

      // 2. Kirim notif ke PEMBINA dengan alasan penolakan
      await supabase.from("notifikasi").insert({
        target_role: "pembina",
        tipe: "rejected",
        message: alasanPenolakan.trim(),
        is_read: false,
        laporan_id: laporan.id,
        sender_nisnip: null,
      });

      // 3. Tandai notif admin ini sudah dibaca
      await supabase
        .from("notifikasi")
        .update({ is_read: true })
        .eq("id", item.id);

      setShowRejectModal(false);
      setRejectTarget(null);
      setAlasanPenolakan("");
      alert("Laporan ditolak & alasan telah dikirim ke Pembina.");
      fetchNotifList();
    } catch (err) {
      console.error(err);
      alert("Gagal menolak laporan!");
    } finally {
      setLoadingReject(false);
    }
  };

  // ─── Tandai notif sebagai sudah dibaca ───────────────────────────────────
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

  // ─── Helpers label status laporan ────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "accepted")
      return <span className="badge badge-accepted">✓ Diterima</span>;
    if (status === "rejected")
      return <span className="badge badge-rejected">✕ Ditolak</span>;
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
        <button className="notif-back-btn" onClick={() => router.push("/admin")}>
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
                <div className="notif-item-top-row">
                  <p className="notif-sender-label">Pengirim :</p>
                  {item.statusLaporan && (
                    <StatusBadge status={item.statusLaporan} />
                  )}
                </div>

                <div className="notif-row">
                  {/* Kiri: avatar + nama pengirim */}
                  <div className="notif-left">
                    <div className="notif-avatar">
                      {getInitials(item.namaPengirim ?? "?")}
                    </div>
                    <div>
                      <p className="notif-sender-name">
                        {item.namaPengirim ?? "Sistem"}
                      </p>
                      <p className="notif-sender-role">
                        {item.rolePengirim
                          ? item.rolePengirim.charAt(0).toUpperCase() + item.rolePengirim.slice(1)
                          : "Sistem"}
                      </p>
                    </div>
                  </div>

                  {/* Kanan: info siswa + tombol (hanya laporan pending) */}
                  {item.tipe === "laporan" && (
                    <div className="notif-right">
                      <div className="notif-info-row">
                        <span className="notif-siswa-name">{item.namaSiswa}</span>
                        <span className="notif-poin-badge">{item.poin} poin</span>
                        <span className="notif-desc">{item.deskripsi}</span>
                      </div>

                      {/* Tombol hanya muncul jika masih pending */}
                      {item.statusLaporan === "pending" && (
                        <div className="notif-actions">
                          <button
                            className="btn-accept"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptLaporan(item);
                            }}
                          >
                            ✓ Accept
                          </button>
                          <button
                            className="btn-reject"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(item);
                            }}
                          >
                            ✕ Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* ── MODAL REJECT ── */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Tolak Laporan</h2>
              <span className="close-btn" onClick={() => setShowRejectModal(false)}>×</span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 8, fontSize: 14, color: "#374151" }}>
                Siswa: <b>{rejectTarget?.namaSiswa}</b><br />
                Pelanggaran: <b>{rejectTarget?.deskripsi}</b>
              </p>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                Alasan Penolakan
              </label>
              <textarea
                value={alasanPenolakan}
                onChange={(e) => setAlasanPenolakan(e.target.value)}
                placeholder="Tuliskan alasan penolakan laporan ini..."
                rows={4}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                className="notif-reject-submit"
                onClick={confirmReject}
                disabled={loadingReject}
              >
                {loadingReject ? "Mengirim..." : "Tolak & Kirim"}
              </button>
              <button className="btn-no" onClick={() => setShowRejectModal(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}