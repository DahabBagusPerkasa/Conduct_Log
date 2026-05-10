"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./notifikasi.css";

export default function WalasNotifikasiPage() {
  const router = useRouter();
  const [notifikasi, setNotifikasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) { router.replace("/login"); return; }
        const data = await res.json();
        if (!data.user || data.user.role !== "walas") {
          router.replace("/login");
          return;
        }
        setUserData(data.user);
      } catch {
        router.replace("/login");
      }
    };
    fetchSession();
  }, [router]);

  // ── Fetch notifikasi ──────────────────────────────────────────────────────
  const fetchNotif = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifikasi")
        .select("*")
        .eq("target_role", "walas")
        .eq("target_nisnip", userData.nisnip)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setNotifikasi([]); return; }
      setNotifikasi(data || []);
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

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData) return;
    const channel = supabase
      .channel("walas-notif-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifikasi" },
        (payload) => {
          const n = payload.new as any;
          if (n.target_role === "walas" && n.target_nisnip === userData.nisnip) {
            fetchNotif();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userData]);

  // ── Tandai dibaca ─────────────────────────────────────────────────────────
  const handleRead = async (item: any) => {
    if (item.is_read) return;
    await supabase.from("notifikasi").update({ is_read: true }).eq("id", item.id);
    setNotifikasi((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
  };

  // ── Tandai semua dibaca ───────────────────────────────────────────────────
  const handleReadAll = async () => {
    const unreadIds = notifikasi.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifikasi").update({ is_read: true }).in("id", unreadIds);
    setNotifikasi((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  };

  const unreadCount = notifikasi.filter((n) => !n.is_read).length;

  return (
    <div className="wn-page">

      {/* ── Header ── */}
      <div className="wn-header">
        <div className="wn-title-wrap">
          <h1 className="wn-title">Notifikasi</h1>
          {unreadCount > 0 && (
            <span className="wn-unread-chip">{unreadCount} baru</span>
          )}
        </div>
        <div className="wn-header-right">
          {unreadCount > 0 && (
            <button className="wn-readall-btn" onClick={handleReadAll}>
              Tandai semua dibaca
            </button>
          )}
          <button className="wn-back-btn" onClick={() => router.push("/walas")}>
            <span>‹</span> Kembali
          </button>
        </div>
      </div>

      {/* ── Card wrapper ── */}
      <div className="wn-card-wrap">
        {loading ? (
          <p className="wn-state">Memuat notifikasi...</p>
        ) : notifikasi.length === 0 ? (
          <p className="wn-state">Belum ada notifikasi.</p>
        ) : (
          notifikasi.map((item, idx) => (
            <div key={item.id}>
              <div
                className={`wn-item${!item.is_read ? " wn-item--unread" : ""}`}
                onClick={() => handleRead(item)}
              >
                {/* Top row: label pengirim + badge */}
                <div className="wn-item-top-row">
                  <p className="wn-sender-label">Notifikasi :</p>
                  <span className="wn-tipe-badge wn-tipe-pelanggaran">
                    🔴 Pelanggaran Baru
                  </span>
                </div>

                {/* Row: avatar + pesan */}
                <div className="wn-row">
                  <div className="wn-left">
                    <div className="wn-avatar">SY</div>
                    <div>
                      <p className="wn-sender-name">Sistem</p>
                      <p className="wn-sender-role">Conduct Log</p>
                    </div>
                  </div>
                  <div className="wn-right">
                    <p className="wn-message">{item.message}</p>
                  </div>
                </div>

                <p className="wn-timestamp">
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              {idx < notifikasi.length - 1 && <hr className="wn-divider" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}