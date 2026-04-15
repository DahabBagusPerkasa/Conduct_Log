"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../admin.css";

export default function AdminNotifikasiPage() {
  const [notifikasi, setNotifikasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifList = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifikasi")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("FETCH NOTIF LIST ERROR:", error);
        alert("Gagal memuat notifikasi");
        setNotifikasi([]);
        return;
      }

      setNotifikasi(data || []);
    } catch (error) {
      console.error("FETCH NOTIF LIST ERROR:", error);
      alert("Gagal memuat notifikasi");
      setNotifikasi([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const { error } = await supabase
        .from("notifikasi")
        .update({ is_read: true })
        .eq("id", id);

      if (error) {
        console.error("MARK AS READ ERROR:", error);
        alert("Gagal memperbarui notifikasi");
        return;
      }

      await fetchNotifList();
    } catch (error) {
      console.error("MARK AS READ ERROR:", error);
      alert("Gagal memperbarui notifikasi");
    }
  };

  useEffect(() => {
    fetchNotifList();
  }, []);

  return (
    <div className="content" style={{ padding: "30px", minHeight: "100vh" }}>
      <div className="home-container">
        <div className="welcome-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1>Notifikasi</h1>
              <p className="abu-abu">Daftar notifikasi untuk peran admin.</p>
            </div>
            <button className="btn-no" onClick={() => router.push("/admin")}>Kembali</button>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Memuat notifikasi...</p>
        ) : notifikasi.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada notifikasi.</p>
          </div>
        ) : (
          <div>
            {notifikasi.map((item) => (
              <div
                key={item.id}
                className="notification-card"
                onClick={() => markAsRead(item.id)}
              >
                <h3>{item.message}</h3>
                <p>Target: {item.target_role}</p>
                <small>{item.is_read ? "Sudah dibaca" : "Belum dibaca"}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
