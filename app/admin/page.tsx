"use client";

import "./admin.css";
import LoadingScreen from "../components/LoadingScreen";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSiswa } from "@/hooks/useSiswa";
import { useKasus } from "@/hooks/useKasus";
import { useDashboard } from "@/hooks/useDashboard";

export default function AdminPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState("home");
  const [showSetting, setShowSetting] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [search, setSearch] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [listSiswa, setListSiswa] = useState<any[]>([]);
  const [listJenis, setListJenis] = useState<any[]>([]);
  const [selectedSiswa, setSelectedSiswa] = useState("");
  const [selectedJenis, setSelectedJenis] = useState("");
  const [poin, setPoin] = useState(0);
  const [bukti, setBukti] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const limit = 20;

  const { dataSiswa, loadingSiswa, totalSiswaData, pageSiswa, setPageSiswa } =
    useSiswa({ search, activeMenu, limit });

  const { dataKasus, loadingKasus, fetchKasus } =
    useKasus({ search, activeMenu });

  const { totalSiswa, sp1, sp2, tindakLanjut } = useDashboard();

  // ================= AUTH ==================
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
        if (!data.user || data.user.role !== "admin") {
          router.replace("/login");
          return;
        }

        setUserData(data.user);
      } catch (error) {
        console.error("Admin session check error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  // ================= NOTIF =================
  const fetchNotifCount = async () => {
    const { count, error } = await supabase
      .from("notifikasi")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("target_role", "admin");

    if (error) {
      console.error("FETCH NOTIF COUNT ERROR:", error);
      return;
    }

    setNotifCount(count || 0);
  };

  useEffect(() => {
    fetchNotifCount();
  }, []);

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

  const fetchDropdown = async () => {
    const { data: siswa, error: siswaError } = await supabase
      .from("user")
      .select("id, nisnip, nama");

    const { data: jenis, error: jenisError } = await supabase
      .from("jenis_pelanggaran")
      .select("id, nama, poin");

    if (siswaError || jenisError) {
      console.error("FETCH DROPDOWN ERROR:", siswaError || jenisError);
      alert("Gagal memuat data input pelanggaran");
      return;
    }

    console.log("LIST SISWA DROPDOWN", siswa);
    setListSiswa(siswa || []);
    setListJenis(jenis || []);
  };

  useEffect(() => {
    if (activeMenu === "input") {
      fetchDropdown();
    }
  }, [activeMenu]);

  useEffect(() => {
    const selected = listJenis.find((j) => j.id == selectedJenis);
    if (selected) {
      setPoin(selected.poin);
    } else {
      setPoin(0);
    }
  }, [selectedJenis, listJenis]);

  const handleSubmit = async () => {
    if (!selectedSiswa || !selectedJenis) {
      alert("Lengkapi data dulu!");
      return;
    }

    setLoadingSubmit(true);

    try {
      const student = listSiswa.find(s => s.id == selectedSiswa);
      if (!student) {
        alert("Siswa tidak ditemukan!");
        return;
      }

      if (userData.role === "admin") {
        // ✅ ADMIN langsung masuk pelanggaran
        const { error } = await supabase.from("pelanggaran").insert({
          user_id: selectedSiswa,
          jenis_id: selectedJenis,
          poin,
          bukti,
        });

        if (error) throw error;

      } else if (userData.role === "pembina") {
        // 🟡 MASUK KE LAPORAN (pending)
        const { data: laporanData, error: laporanError } = await supabase.from("laporan_pelanggaran").insert({
          nisnip: student.nisnip,
          jenis_id: selectedJenis,
          poin,
          pelapor_nisnip: userData.nisnip,
        }).select().single();

        if (laporanError) throw laporanError;

        // 🔔 kirim notif ke admin
        await supabase.from("notifikasi").insert({
          target_role: "admin",
          message: "Pelanggaran baru diantrian",
          is_read: false,
          laporan_id: laporanData.id,
        });
      }

      alert("Berhasil!");
      setSelectedSiswa("");
      setSelectedJenis("");
      setPoin(0);
      setBukti("");
      fetchKasus();

    } catch (err) {
      console.error(err);
      alert("Gagal!");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const SiswaCard = ({ item }: { item: any }) => (
    <div className="siswa-card">
      <div className="siswa-avatar">{getInitial(item.nama)}</div>
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
  );

  const KasusCard = ({ item }: { item: any }) => (
    <div className="siswa-card">
      <div className="siswa-avatar">{getInitial(item.user?.nama)}</div>
      <div className="siswa-info">
        <h3>{item.user?.nama || "Tidak diketahui"}</h3>
        <p>NIS/NIP: {item.user?.nisnip}</p>
        <span className="kelas">{item.user?.kelas}</span>
        <p className="kasus-text">
          Kasus: <b>{item.jenis_pelanggaran?.nama || "-"}</b>
        </p>
        <p className="poin-text">
          Poin: <b>{item.poin}</b>
        </p>
      </div>
    </div>
  );

  if (loading) return <LoadingScreen message="Loading dashboard..." fullPage />;

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
            <div
              className="notif-wrapper"
              onClick={() => router.push("/admin/notifikasi")}
              style={{ cursor: "pointer" }}
            >
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
                  {userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <main className="content">

          {/* SEARCH RESULT (GLOBAL) */}
          {search ? (
            <>
              <h1 className="search-title">"{search}"</h1>
              <div className="search-result">
                <div className="search-section">
                  <p className="search-label">Siswa</p>

                  {loadingSiswa ? (
                    <p className="loading-text">Loading...</p>
                  ) : dataSiswa.length === 0 ? (
                    <p className="empty-text">Tidak ada data</p>
                  ) : (
                    dataSiswa.map((item, i) => (
                      <SiswaCard key={item.nisnip || i} item={item} />
                    ))
                  )}
                </div>

                <div className="search-section">
                  <p className="search-label">Kasus</p>

                  {loadingKasus ? (
                    <p className="loading-text">Loading...</p>
                  ) : dataKasus.length === 0 ? (
                    <p className="empty-text">Tidak ada data</p>
                  ) : (
                    dataKasus.map((item) => (
                      <KasusCard key={item.id} item={item} />
                    ))
                  )}
                </div>
              </div>
            </>
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
                      <SiswaCard key={item.nisnip || i} item={item} />
                    ))}

                    {totalSiswaData > 0 && (
                      <div className="pagination">
                        <button disabled={pageSiswa === 0} onClick={() => setPageSiswa(p => p - 1)}>Prev</button>
                        <span>Page {pageSiswa + 1} / {Math.ceil(totalSiswaData / limit)}</span>
                        <button disabled={(pageSiswa + 1) * limit >= totalSiswaData} onClick={() => setPageSiswa(p => p + 1)}>Next</button>
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
                    {dataKasus.map((item) => (
                      <KasusCard key={item.id} item={item} />
                    ))}
                  </div>
                )
              )}

              {activeMenu === "input" && (
                <div className="input-container">
                  <h2>Input Pelanggaran</h2>

                  <div className="form-group">
                    <label>Siswa</label>
                    <select
                      value={selectedSiswa}
                      onChange={(e) => setSelectedSiswa(e.target.value)}
                    >
                      <option value="">Pilih Siswa</option>
                      {listSiswa.map((s) => (
                        <option key={`${s.id}-${s.nisnip}`} value={s.id}>
                          {s.nama} ({s.nisnip})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Jenis Pelanggaran</label>
                    <select
                      value={selectedJenis}
                      onChange={(e) => setSelectedJenis(e.target.value)}
                    >
                      <option value="">Pilih Pelanggaran</option>
                      {listJenis.map((j) => (
                        <option key={`${j.id}-${j.nama}`} value={j.id}>
                          {j.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Poin</label>
                    <input value={poin} disabled />
                  </div>

                  <div className="form-group">
                    <label>Bukti (opsional)</label>
                    <input
                      type="text"
                      placeholder="Masukkan bukti atau keterangan"
                      value={bukti}
                      onChange={(e) => setBukti(e.target.value)}
                    />
                  </div>

                  <button onClick={handleSubmit}>
                    {loadingSubmit ? "Menyimpan..." : "Simpan"}
                  </button>
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