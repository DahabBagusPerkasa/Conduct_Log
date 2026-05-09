"use client";

import "./walas.css";
import LoadingScreen from "../components/LoadingScreen";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Page = "home" | "siswa" | "pelanggaran";

export default function WalasPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>("home");

  const [showSetting, setShowSetting] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const [dataSiswa, setDataSiswa] = useState<any[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 9;
  const [totalData, setTotalData] = useState(0);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [kelas, setKelas] = useState("");

  const [dataPelanggaran, setDataPelanggaran] = useState<any[]>([]);
  const [loadingPelanggaran, setLoadingPelanggaran] = useState(false);
  const [searchPelanggaran, setSearchPelanggaran] = useState("");
  const [pagePelanggaran, setPagePelanggaran] = useState(0);
  const [totalPelanggaran, setTotalPelanggaran] = useState(0);

  const [statsStatus, setStatsStatus] = useState({ aman: 0, perhatian: 0, berbahaya: 0 });

  // ================= AUTH =================
  useEffect(() => {
    const fetchSession = async () => {
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

        if (!data.user || data.user.role !== "walas") {
          router.replace("/login");
          return;
        }

        setUserData(data.user);
        setKelas(data.user.kelas);
      } catch (error) {
        console.error("Walas session check error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  // ================= FETCH SISWA =================
  const fetchSiswa = async () => {
    if (!userData) return;
    setLoadingSiswa(true);
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("user")
      .select("nama, nisnip, kelas", { count: "exact" })
      .eq("perwalian", userData.nisnip)
      .eq("role", "siswa");

    if (search) query = query.or(`nama.ilike.%${search}%,nisnip.ilike.%${search}%`);

    const { data, count } = await query.range(from, to);
    setDataSiswa(data || []);
    setTotalData(count || 0);
    setLoadingSiswa(false);
  };

  // ================= FETCH PELANGGARAN =================
  const fetchPelanggaran = async () => {
    if (!userData) return;
    setLoadingPelanggaran(true);
    const from = pagePelanggaran * limit;
    const to = from + limit - 1;
    const nip = userData.nisnip;

    const { data: siswa } = await supabase
      .from("user")
      .select("id")
      .eq("role", "siswa")
      .eq("perwalian", nip);

    const siswaIds = (siswa || []).map((s: any) => s.id);

    if (siswaIds.length === 0) {
      setDataPelanggaran([]);
      setTotalPelanggaran(0);
      setLoadingPelanggaran(false);
      return;
    }

    let query = supabase
      .from("pelanggaran")
      .select(`
        id,
        poin,
        bukti,
        created_at,
        user_id,
        user:user_id ( nama, nisnip, kelas ),
        jenis_pelanggaran:jenis_id ( nama )
      `, { count: "exact" })
      .in("user_id", siswaIds)
      .order("created_at", { ascending: false });

    if (searchPelanggaran) {
      query = query.ilike("user.nisnip", `%${searchPelanggaran}%`);
    }

    const { data, count } = await query.range(from, to);
    setDataPelanggaran(data || []);
    setTotalPelanggaran(count || 0);
    setLoadingPelanggaran(false);
  };

  // ================= DASHBOARD STATS =================
  const fetchDashboard = async () => {
    if (!userData) return;
    const nip = userData.nisnip;

    const { count } = await supabase
      .from("user")
      .select("*", { count: "exact", head: true })
      .eq("perwalian", nip)
      .eq("role", "siswa");
    setTotalSiswa(count || 0);

    const { data: siswa } = await supabase
      .from("user")
      .select("id")
      .eq("perwalian", nip)
      .eq("role", "siswa");

    const siswaIds = (siswa || []).map((s: any) => s.id);
    if (siswaIds.length === 0) {
      setStatsStatus({ aman: count || 0, perhatian: 0, berbahaya: 0 });
      return;
    }

    const { data: poinData } = await supabase
      .from("pelanggaran")
      .select("user_id, poin")
      .in("user_id", siswaIds);

    const poinMap: Record<string, number> = {};
    (poinData || []).forEach((p: any) => {
      poinMap[p.user_id] = (poinMap[p.user_id] || 0) + p.poin;
    });

    let aman = 0, perhatian = 0, berbahaya = 0;
    siswaIds.forEach((id: string) => {
      const total = poinMap[id] || 0;
      if (total >= 50) berbahaya++;
      else if (total >= 20) perhatian++;
      else aman++;
    });

    setStatsStatus({ aman, perhatian, berbahaya });
  };

  useEffect(() => {
    if (!userData) return;
    fetchSiswa();
    fetchDashboard();

    const channel = supabase
      .channel("walas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user" }, () => {
        fetchSiswa(); fetchDashboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userData, page, search]);

  useEffect(() => {
    if (!userData) return;
    fetchPelanggaran();
  }, [userData, pagePelanggaran, searchPelanggaran]);

  if (loading) {
    return (
      <LoadingScreen
        message="Loading dashboard..."
        fullPage
      />
    );
  }

  const formatName = (name: string) => {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length >= 3) return `${parts[0]} ${parts[1]} .${parts[2][0]}`;
    return name;
  };

  const getInitial = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((p: string) => p[0]).slice(0, 2).join(".");
  };

  return (
    <div className="walas-container">

      {/* ========== SIDEBAR ========== */}
      <aside className="sidebar">
        <div className="logo-box">
          <img src="/assets/img/LogoCL.png" className="logo-img" />
          <div>
            <h3>Conduct Log</h3>
            <p className="abu-abu">Behavior Portal</p>
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
            className={`menu-item ${activePage === "siswa" ? "active" : ""}`}
            onClick={() => setActivePage("siswa")}
          >
            <img src="/assets/img/data siswa.png" className="icon" />
            <span>Data Siswa</span>
          </div>

          <div
            className={`menu-item ${activePage === "pelanggaran" ? "active" : ""}`}
            onClick={() => setActivePage("pelanggaran")}
          >
            <img src="/assets/img/kasus.png" className="icon" />
            <span>Pelanggaran</span>
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

      {/* ========== MAIN AREA ========== */}
      <div className="main-area">

        {/* TOPBAR */}
        <div className="topbar">
          <input
            type="text"
            placeholder="Cari siswa, pelanggaran..."
            className="search-input"
          />
          <div className="topbar-right">
            <div className="notif-wrapper">
              <img src="/assets/img/notifikasi.png" className="icon" />
              <span className="notif-badge">3</span>
            </div>
            <div className="profile">
              <div className="avatar">{getInitial(userData?.nama)}</div>
              <div className="profile-text">
                <span className="name">{formatName(userData?.nama)}</span>
                <span className="role">
                  Wali Kelas ({userData?.kelas})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <main className="content">

          {/* ======== HOME ======== */}
          {activePage === "home" && (
            <div className="home-container">
              <div className="welcome-box">
                <h1>Welcome Back, {formatName(userData?.nama)} 👋</h1>
                <p className="abu-abu">Selamat datang kembali di dashboard Wali Kelas</p>
              </div>

              <div className="dashboard-cards">
                <div className="stat-card">
                  <div className="icon-box blue">
                    <img src="/assets/img/icon-siswa.png" />
                  </div>
                  <h2>{totalSiswa}</h2>
                  <p>Total Siswa Perwalian</p>
                </div>

                <div className="stat-card">
                  <div className="icon-box green">
                    <img src="/assets/img/aman.png" />
                  </div>
                  <h2>{statsStatus.aman}</h2>
                  <p>Status Aman</p>
                </div>

                <div className="stat-card">
                  <div className="icon-box yellow icon-text">!</div>
                  <h2>{statsStatus.perhatian}</h2>
                  <p>Perlu Perhatian</p>
                </div>

                <div className="stat-card">
                  <div className="icon-box red">
                    <img src="/assets/img/icon-sp2.png" />
                  </div>
                  <h2>{statsStatus.berbahaya}</h2>
                  <p>Berbahaya</p>
                </div>
              </div>

              <div className="home-nav-cards">
                <div className="nav-card" onClick={() => setActivePage("siswa")}>
                  <div className="nav-card-icon">
                    <img src="/assets/img/data siswa.png" alt="Data Siswa" className="nav-card-img" />
                  </div>
                  <p className="nav-card-label">Data Siswa</p>
                  <button className="nav-card-btn">Lihat</button>
                </div>

                <div className="nav-card" onClick={() => setActivePage("pelanggaran")}>
                  <div className="nav-card-icon">
                    <img src="/assets/img/pelanggaran.png" alt="Pelanggaran" className="nav-card-img" />
                  </div>
                  <p className="nav-card-label">Pelanggaran</p>
                  <button className="nav-card-btn">Lihat</button>
                </div>
              </div>

              <footer className="page-footer">© Copyright 2026</footer>
            </div>
          )}

          {/* ======== DATA SISWA ======== */}
          {activePage === "siswa" && (
            <div className="inner-container">
              <button className="back-btn" onClick={() => setActivePage("home")}>
                ‹ Kembali
              </button>

              <div className="section-header">
                <h2 className="page-title-center">Data Siswa Perwalian</h2>
                <input
                  type="text"
                  placeholder="Cari nama / NIS..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="search-input"
                />
              </div>

              {loadingSiswa ? (
                <p className="loading-text">Loading Data Siswa...</p>
              ) : dataSiswa.length === 0 ? (
                <div className="empty-state">
                  <p>Data tidak ditemukan</p>
                </div>
              ) : (
                <div className="siswa-container">
                  {dataSiswa.map((item, i) => (
                    <div key={i} className="siswa-card">
                      <div className="siswa-avatar">{getInitial(item.nama)}</div>
                      <div className="siswa-info">
                        <h3>{item.nama}</h3>
                        <p>NIS: {item.nisnip}</p>
                        <span className="kelas">{item.kelas}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalData > 0 && (
                <div className="pagination">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <span>Page {page + 1} / {Math.ceil(totalData / limit)}</span>
                  <button disabled={(page + 1) * limit >= totalData} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}

              <footer className="page-footer">© Copyright 2026</footer>
            </div>
          )}

          {/* ======== PELANGGARAN ======== */}
          {activePage === "pelanggaran" && (
            <div className="inner-container">
              <button className="back-btn" onClick={() => setActivePage("home")}>
                ‹ Kembali
              </button>

              {loadingPelanggaran ? (
                <p className="loading-text">Loading Data Pelanggaran...</p>
              ) : dataPelanggaran.length === 0 ? (
                <div className="empty-state">
                  <p>Data tidak ditemukan</p>
                </div>
              ) : (
                <div className="siswa-container">
                  {dataPelanggaran.map((item: any, i: number) => (
                    <div key={i} className="siswa-card">
                      <div className="siswa-avatar">{getInitial(item.user?.nama)}</div>
                      <div className="siswa-info">
                        <h3>{item.user?.nama || "Tidak diketahui"}</h3>
                        <p>NIS: {item.user?.nisnip || "-"}</p>
                        <span className="kelas">{item.user?.kelas || "-"}</span>
                        <p className="kasus-text">
                          Kasus: <b>{item.jenis_pelanggaran?.nama || "-"}</b>
                        </p>
                        <p className="poin-text">
                          Poin: <b>{item.poin}</b>
                        </p>
                        <p className="tanggal-text">
                          {new Date(item.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPelanggaran > 0 && (
                <div className="pagination">
                  <button disabled={pagePelanggaran === 0} onClick={() => setPagePelanggaran(p => p - 1)}>Prev</button>
                  <span>Page {pagePelanggaran + 1} / {Math.ceil(totalPelanggaran / limit)}</span>
                  <button disabled={(pagePelanggaran + 1) * limit >= totalPelanggaran} onClick={() => setPagePelanggaran(p => p + 1)}>Next</button>
                </div>
              )}

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
              <button
                className="btn-yes"
                onClick={async () => {
                  await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                  });

                  window.location.href = "/";
                }}
              >
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