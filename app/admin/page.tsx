"use client";

import "./admin.css";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("home");
  const [showSetting, setShowSetting] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [search, setSearch] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [sp1, setSp1] = useState(0);
  const [sp2, setSp2] = useState(0);
  const [tindakLanjut, setTindakLanjut] = useState(0);
  const [dataSiswa, setDataSiswa] = useState<any[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [dataKasus, setDataKasus] = useState<any[]>([]);
  const [loadingKasus, setLoadingKasus] = useState(false);

  // PAGINATION
  const [page, setPage] = useState(0);
  const limit = 20;
  const [totalData, setTotalData] = useState(0);

  // ================= FETCH SISWA =================
  const fetchSiswa = async () => {
    setLoadingSiswa(true);

    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("user")
      .select("nama, nisnip, kelas, role", { count: "exact" });

    if (search) {
      query = query.or(`nama.ilike.%${search}%,nisnip.ilike.%${search}%`);
    }

    const { data, count } = await query.range(from, to);

    setDataSiswa(data || []);
    setTotalData(count || 0);
    setLoadingSiswa(false);
  };

  // ================= FETCH KASUS =================
  const fetchKasus = async () => {
    setLoadingKasus(true);

    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("pelanggaran")
      .select(`
        nisnip,
        poin,
        user ( nama, kelas ),
        jenis_pelanggaran ( nama )
      `, { count: "exact" });

    if (search) {
      query = query.or(`nisnip.ilike.%${search}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) console.error(error);

    setDataKasus(data || []);
    setTotalData(count || 0);
    setLoadingKasus(false);
  };

  // ================= AUTH ==================
  useEffect(() => {
    const nisnip = localStorage.getItem("nisnip");

    if (!nisnip) {
      window.location.href = "/login";
      return;
    }

    const fetchUser = async () => {
      const { data } = await supabase
        .from("user")
        .select("*")
        .eq("nisnip", nisnip)
        .single();

      if (!data) {
        window.location.href = "/login";
        return;
      }

      setUserData(data);
      setLoading(false);
    };

    fetchUser();
  }, []);

  // ================= NOTIF =================
  useEffect(() => {
    const channel = supabase
      .channel("pelanggaran-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pelanggaran",
        },
        () => {
          setNotifCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ================= DASHBOARD =================
  const fetchDashboard = async () => {
    const { count } = await supabase
      .from("user")
      .select("*", { count: "exact", head: true });

    setTotalSiswa(count || 0);

    const { data: pelanggaran } = await supabase
      .from("pelanggaran")
      .select("nisnip, poin");

    if (!pelanggaran) return;

    const mapPoin: any = {};

    pelanggaran.forEach((item) => {
      if (!mapPoin[item.nisnip]) {
        mapPoin[item.nisnip] = 0;
      }
      mapPoin[item.nisnip] += item.poin;
    });

    let sp1Count = 0;
    let sp2Count = 0;
    let tindakCount = 0;

    Object.values(mapPoin).forEach((total: any) => {
      if (total >= 150) tindakCount++;
      else if (total >= 100) sp2Count++;
      else if (total >= 50) sp1Count++;
    });

    setSp1(sp1Count);
    setSp2(sp2Count);
    setTindakLanjut(tindakCount);
  };

  useEffect(() => {
    fetchDashboard();

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelanggaran",
        },
        () => {
          fetchDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ================= REALTIME SISWA =================
  useEffect(() => {
    if (activeMenu !== "siswa" && !search) return;

    fetchSiswa();

    const channel = supabase
      .channel("siswa-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user",
        },
        () => {
          fetchSiswa();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu, page, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  // ================= REALTIME KASUS =================
  useEffect(() => {
    if (activeMenu !== "kasus") return;

    fetchKasus();

    const channel = supabase
      .channel("kasus-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelanggaran",
        },
        () => {
          fetchKasus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu, page, search]);

  // ================= FORMAT ==================
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
    const parts = name.split(" ");
    return parts.map(p => p[0]).slice(0, 2).join(".");
  };

  if (loading) return null;

  return (
    <div className="admin-container">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-box">
          <img src="/assets/img/LogoCL.png" className="logo-img" />
          <div>
            <h3>Conduct Log</h3>
            <p className="abu-abu">Behavior Portal</p>
          </div>
        </div>

        <div className="menu-list">
          <div className={`menu-item ${activeMenu === "home" ? "active" : ""}`}
            onClick={() => setActiveMenu("home")}>
            <img src="/assets/img/home.png" className="icon" />
            <span>Home</span>
          </div>

          <div className={`menu-item ${activeMenu === "siswa" ? "active" : ""}`}
            onClick={() => setActiveMenu("siswa")}>
            <img src="/assets/img/data siswa.png" className="icon" />
            <span>Data Siswa</span>
          </div>

          <div className={`menu-item ${activeMenu === "kasus" ? "active" : ""}`}
            onClick={() => setActiveMenu("kasus")}>
            <img src="/assets/img/kasus.png" className="icon" />
            <span>Kasus</span>
          </div>

          <div className={`menu-item ${activeMenu === "input" ? "active" : ""}`}
            onClick={() => setActiveMenu("input")}>
            <img src="/assets/img/input pelanggaran.png" className="icon" />
            <span>Input Pelanggaran</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="menu-item" onClick={() => setShowSetting(true)}>
            <img src="/assets/img/setting.png" className="icon" />
            <span className="setting">Setting</span>
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
          <input
            type="text"
            placeholder="Cari menggunakan Nama atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />

          <div className="topbar-right">
            <div className="notif-wrapper">
              <img src="/assets/img/notifikasi.png" className="icon" />
              {notifCount > 0 && (
                <span className="notif-badge">{notifCount}</span>
              )}
            </div>

            <div className="profile">
              <div className="avatar">
                {getInitial(userData?.nama)}
              </div>

              <div className="profile-text">
                <span className="name">
                  {formatName(userData?.nama)}
                </span>
                <span className="role">
                  {userData?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <main className="content">

          {/* SEARCH RESULT (GLOBAL) */}
          {search ? (
            <div className="siswa-container">

              {loadingSiswa ? (
                <p className="loading-text">Loading Data Siswa...</p>
              ) : dataSiswa.length === 0 ? (
                <div className="empty-state">
                  <p>Data tidak ditemukan</p>
                </div>
              ) : (
                dataSiswa.map((item, i) => (
                  <div key={item.nisnip || i} className="siswa-card">

                    <div className="siswa-avatar">
                      {getInitial(item.nama)}
                    </div>

                    <div className="siswa-info">
                      <h3>
                        {item.nama}
                        {item.role === "admin" && (
                          <span className="badge-admin">Admin</span>
                        )}
                      </h3>
                      <p>NIS/NIP: {item.nisnip}</p>
                      <span className="kelas">{item.kelas}</span>
                    </div>

                  </div>
                ))
              )}

              {totalData > 0 && (
                <div className="pagination">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <span>Page {page + 1} / {Math.ceil(totalData / limit)}</span>
                  <button disabled={(page + 1) * limit >= totalData} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}

            </div>
          ) : (
            <>
              {activeMenu === "home" && (
                <div className="home-container">
                  <div className="welcome-box">
                    <h1>Welcome Back, {formatName(userData?.nama)} 👋</h1>
                    <p className="abu-abu">Selamat datang kembali di dashboard Conduct Log</p>
                  </div>

                  <div className="dashboard-cards">
                    <div className="stat-card">
                      <div className="icon-box blue">
                        <img src="/assets/img/icon-siswa.png" />
                      </div>
                      <h2>{totalSiswa}</h2>
                      <p>Total Siswa</p>
                    </div>

                    <div className="stat-card">
                      <div className="icon-box yellow icon-text">!</div>
                      <h2>{sp1}</h2>
                      <p>Siswa SP 1</p>
                    </div>

                    <div className="stat-card">
                      <div className="icon-box red">
                        <img src="/assets/img/icon-sp2.png" />
                      </div>
                      <h2>{sp2}</h2>
                      <p>Siswa SP 2</p>
                    </div>

                    <div className="stat-card">
                      <div className="icon-box orange">
                        <img src="/assets/img/icon-tindak.png" />
                      </div>
                      <h2>{tindakLanjut}</h2>
                      <p>Siswa Tindak Lanjut</p>
                    </div>
                  </div>
                </div>
              )}

              {activeMenu === "siswa" && (
                loadingSiswa ? (
                  <p className="loading-text">Loading Data Siswa...</p>
                ) : dataSiswa.length === 0 ? (
                  <div className="empty-state">
                    <p>Data tidak ditemukan</p>
                  </div>
                ) : (
                  <div className="siswa-container">
                    {dataSiswa.map((item, i) => (
                      <div key={item.nisnip || i} className="siswa-card">

                        <div className="siswa-avatar">
                          {getInitial(item.nama)}
                        </div>

                        <div className="siswa-info">
                          <h3>
                            {item.nama}
                            {item.role === "admin" && (
                              <span className="badge-admin">Admin</span>
                            )}
                          </h3>
                          <p>NIS/NIP: {item.nisnip}</p>
                          <span className="kelas">{item.kelas}</span>
                        </div>

                      </div>
                    ))}

                    {totalData > 0 && (
                      <div className="pagination">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
                        <span>Page {page + 1} / {Math.ceil(totalData / limit)}</span>
                        <button disabled={(page + 1) * limit >= totalData} onClick={() => setPage(p => p + 1)}>Next</button>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeMenu === "kasus" && (
                loadingKasus ? (
                  <p className="loading-text">Loading Data Kasus...</p>
                ) : dataKasus.length === 0 ? (
                  <div className="empty-state">
                    <p>Data tidak ditemukan</p>
                  </div>
                ) : (
                  <div className="siswa-container">
                    {dataKasus.map((item, i) => (
                      <div key={i} className="siswa-card">

                        <div className="siswa-avatar">
                          {getInitial(item.user?.nama)}
                        </div>

                        <div className="siswa-info">
                          <h3>{item.user?.nama || "Tidak diketahui"}</h3>
                          <p>NIS/NIP: {item.nisnip}</p>
                          <span className="kelas">{item.user?.kelas}</span>

                          <p className="kasus-text">
                            Kasus: <b>{item.jenis_pelanggaran?.nama || "-"}</b>
                          </p>

                          <p className="poin-text">
                            Poin: <b>{item.poin}</b>
                          </p>
                        </div>

                      </div>
                    ))}

                    {totalData > 0 && (
                      <div className="pagination">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
                        <span>Page {page + 1} / {Math.ceil(totalData / limit)}</span>
                        <button disabled={(page + 1) * limit >= totalData} onClick={() => setPage(p => p + 1)}>Next</button>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeMenu === "input" && (
                <div className="placeholder">
                  <h2>Input Pelanggaran Content</h2>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* MODALS tetap */}
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
                onClick={() => {
                  localStorage.removeItem("nisnip");
                  window.location.href = "/";
                }}
              >
                Ya, Logout
              </button>
              <button
                className="btn-no"
                onClick={() => setShowLogout(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}