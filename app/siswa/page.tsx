"use client";

import "./siswa.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import { supabase } from "@/lib/supabase";

type Page = "home" | "status" | "pelanggaran";

interface StudentStatus {
  aktivitasTerakhir: string;
  poinAnda: number;
  status: "Aman" | "Perhatian" | "Berbahaya";
  detail: string[];
  catatanKesiswaan: string[];
}

export default function SiswaPage() {
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>("home");

  const [showSetting, setShowSetting] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // ✅ PATCH: notif count
  const [notifCount, setNotifCount] = useState(0);

  const [studentStatus, setStudentStatus] = useState<StudentStatus>({
    aktivitasTerakhir: "-",
    poinAnda: 0,
    status: "Aman",
    detail: [],
    catatanKesiswaan: [],
  });

  // ================= AUTH =================
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (!data.user || data.user.role !== "siswa") {
          router.replace("/login");
          return;
        }

        setUserData(data.user);

        const { data: pelanggaranData, error } = await supabase
          .from("pelanggaran")
          .select(`
            id,
            poin,
            bukti,
            created_at,
            jenis_pelanggaran:jenis_id (id, nama)
          `)
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
          return;
        }

        const kasus = pelanggaranData || [];
        const totalPoin = kasus.reduce(
          (sum: number, item: any) => sum + item.poin,
          0
        );

        let status: StudentStatus["status"] = "Aman";
        if (totalPoin >= 50) status = "Berbahaya";
        else if (totalPoin >= 20) status = "Perhatian";

        setStudentStatus({
          aktivitasTerakhir: kasus[0]
            ? new Date(kasus[0].created_at).toLocaleDateString("id-ID")
            : "-",
          poinAnda: totalPoin,
          status,
          detail: kasus.map(
            (item: any) =>
              `${item.jenis_pelanggaran?.nama || "-"} (${item.poin} poin)`
          ),
          catatanKesiswaan: kasus.map(
            (item: any) =>
              `Melanggar: ${item.jenis_pelanggaran?.nama || "-"}`
          ),
        });
      } catch (error) {
        console.error(error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // ================= NOTIF COUNT =================
  const fetchNotifCount = async () => {
    if (!userData) return;

    const { count } = await supabase
      .from("notifikasi")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("target_role", "siswa")
      .eq("target_nisnip", userData.nisnip);

    setNotifCount(count || 0);
  };

  useEffect(() => {
    if (userData) fetchNotifCount();
  }, [userData]);

  // ================= HELPERS =================
  const formatName = (name: string) => {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} .${parts[2][0]}`;
    }
    return name;
  };

  const getInitial = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join(".")
      .toUpperCase();
  };

  const handleLogoutConfirm = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  };

  const statusColorClass =
    studentStatus.status === "Aman"
      ? "status-aman"
      : studentStatus.status === "Perhatian"
      ? "status-perhatian"
      : "status-berbahaya";

  const ShieldIcon = ({ status }: { status: StudentStatus["status"] }) => {
    if (status === "Aman") return <ShieldCheck size={40} color="#22c55e" />;
    if (status === "Perhatian") return <ShieldAlert size={40} color="#eab308" />;
    return <ShieldX size={40} color="#ef4444" />;
  };

  if (loading || !userData) {
    return <LoadingScreen message="Loading dashboard..." fullPage />;
  }

  return (
    <div className="siswa-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-box">
          <img src="/assets/img/LogoCL.png" className="logo-img" />
          <div>
            <h3>Conduct Log</h3>
            <p>Behavior Portal</p>
          </div>
        </div>

        <div className="menu-list">
          <div
            className={`menu-item ${activePage === "home" ? "active" : ""}`}
            onClick={() => setActivePage("home")}
          >
            <img src="/assets/img/home.png" className="icon" />
            <span>Home</span>
          </div>

          <div
            className={`menu-item ${activePage === "status" ? "active" : ""}`}
            onClick={() => setActivePage("status")}
          >
            <img src="/assets/img/kasus.png" className="icon" />
            <span>Status Anda</span>
          </div>

          <div
            className={`menu-item ${activePage === "pelanggaran" ? "active" : ""}`}
            onClick={() => setActivePage("pelanggaran")}
          >
            <img src="/assets/img/pelanggaran.png" className="icon" />
            <span>Poin Pelanggaran</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="menu-item" onClick={() => setShowSetting(true)}>
            <img src="/assets/img/setting.png" className="icon" />
            <span className="setting">Settings</span>
          </div>

          <div className="menu-item" onClick={() => setShowLogout(true)}>
            <img src="/assets/img/log out.png" className="icon" />
            <span className="logout">Logout</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-area">

        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-right">
            {/* ✅ PATCH: notif wrapper dengan router + badge dinamis */}
            <div
              className="notif-wrapper"
              onClick={() => router.push("/siswa/notifikasi")}
              style={{ cursor: "pointer" }}
            >
              <img src="/assets/img/notifikasi.png" className="icon" />
              {notifCount > 0 && (
                <span className="notif-badge">{notifCount}</span>
              )}
            </div>

            <div className="profile">
              <div className="avatar">{getInitial(userData?.nama)}</div>
              <div className="profile-text">
                <span className="name">{formatName(userData?.nama)}</span>
                <span className="role">{userData?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <main className="content">

          {/* ======================== HOME ======================== */}
          {activePage === "home" && (
            <div className="home-container">
              <div className="home-welcome">
                <h1>Welcome back, {userData?.nama}!</h1>
                <p className="abu-abu">Selamat datang kembali!</p>
              </div>

              <div className="home-nav-cards">
                <div className="nav-card">
                  <div className="nav-card-icon">
                    <img src="/assets/img/status-siswa.png" alt="Status Anda" className="nav-card-img" />
                  </div>
                  <p className="nav-card-label">Status Anda</p>
                  <button
                    className="nav-card-btn"
                    onClick={() => setActivePage("status")}
                  >
                    Lihat
                  </button>
                </div>

                <div className="nav-card">
                  <div className="nav-card-icon">
                    <img src="/assets/img/point-pelanggaran.png" alt="Poin Pelanggaran" className="nav-card-img" />
                  </div>
                  <p className="nav-card-label">Poin Pelanggaran</p>
                  <button
                    className="nav-card-btn"
                    onClick={() => setActivePage("pelanggaran")}
                  >
                    Lihat
                  </button>
                </div>
              </div>

              <footer className="page-footer">© Copyright 2026</footer>
            </div>
          )}

          {/* ======================== STATUS ======================== */}
          {activePage === "status" && (
            <div className="inner-container">
              <button className="back-btn" onClick={() => setActivePage("home")}>
                ‹ Kembali
              </button>

              <h2 className="page-title-center">Status Anda</h2>

              <div className="info-row three-col">
                <div className="info-card">
                  <span className="info-label">Aktivitas Terakhir</span>
                  <span className="info-value bold">
                    {studentStatus.aktivitasTerakhir}
                  </span>
                </div>

                <div className="info-card">
                  <span className="info-label">Poin Anda</span>
                  <div className="poin-with-shield">
                    <span className="poin-big">{studentStatus.poinAnda}</span>
                    <ShieldIcon status={studentStatus.status} />
                  </div>
                </div>

                <div className="info-card">
                  <span className="info-label">Status</span>
                  <span className={`status-text ${statusColorClass}`}>
                    {studentStatus.status}
                  </span>
                </div>
              </div>

              <div className="detail-row two-col">
                <div className="detail-col">
                  <h4 className="detail-col-title">Detail</h4>
                  {studentStatus.detail.length === 0 ? (
                    <p className="empty-text">Tidak ada hasil</p>
                  ) : (
                    studentStatus.detail.map((item, i) => (
                      <p key={i} className="detail-item">{item}</p>
                    ))
                  )}
                </div>

                <div className="detail-col">
                  <h4 className="detail-col-title">Catatan Kesiswaan</h4>
                  {studentStatus.catatanKesiswaan.length === 0 ? (
                    <p className="empty-text">Tidak ada hasil</p>
                  ) : (
                    studentStatus.catatanKesiswaan.map((item, i) => (
                      <p key={i} className="detail-item">{item}</p>
                    ))
                  )}
                </div>
              </div>

              <footer className="page-footer">© Copyright 2026</footer>
            </div>
          )}

          {/* ======================== PELANGGARAN ======================== */}
          {activePage === "pelanggaran" && (
            <div className="inner-container">
              <button className="back-btn" onClick={() => setActivePage("home")}>
                ‹ Kembali
              </button>

              <h2 className="page-title-center">Poin Pelanggaran</h2>

              <div className="info-row two-col-unequal">
                <div className="info-card">
                  <span className="info-label">Poin Anda</span>
                  <div className="poin-with-shield">
                    <span className="poin-big">{studentStatus.poinAnda}</span>
                    <ShieldIcon status={studentStatus.status} />
                  </div>
                </div>

                <div className="info-card">
                  <span className="info-label">Status</span>
                  <span className={`status-text ${statusColorClass}`}>
                    {studentStatus.status}
                  </span>
                </div>
              </div>

              <div className="catatan-card">
                <h4 className="catatan-title">Catatan Kesiswaan</h4>
                <hr className="catatan-divider" />
                {studentStatus.catatanKesiswaan.length === 0 ? (
                  <p className="empty-text centered">Tidak ada hasil</p>
                ) : (
                  <div className="detail-body">
                    {studentStatus.catatanKesiswaan.map((item, i) => (
                      <p key={i} className="detail-item">{item}</p>
                    ))}
                  </div>
                )}
              </div>

              <footer className="page-footer">© Copyright 2026</footer>
            </div>
          )}

        </main>
      </div>

      {/* MODAL SETTING */}
      {showSetting && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Setting</h2>
              <span className="close-btn" onClick={() => setShowSetting(false)}>×</span>
            </div>
            <div className="modal-body">
              <p>Pengaturan akan tersedia di sini.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGOUT */}
      {showLogout && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Logout</h2>
              <span className="close-btn" onClick={() => setShowLogout(false)}>×</span>
            </div>
            <div className="modal-body">
              <p>Apakah anda yakin ingin logout?</p>
            </div>
            <div className="modal-actions">
              <button className="btn-yes" onClick={handleLogoutConfirm}>
                Ya, Logout
              </button>
              <button className="btn-no" onClick={() => setShowLogout(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}