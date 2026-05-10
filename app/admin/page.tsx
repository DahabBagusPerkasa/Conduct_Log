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
  const [poin, setPoin] = useState(0);
  const [inputSearch, setInputSearch] = useState("");
  const [selectedSiswaId, setSelectedSiswaId] = useState<any>(null);
  const [selectedJenisId, setSelectedJenisId] = useState<any>(null);
  const [keterangan, setKeterangan] = useState("");
  const [buktiFiles, setBuktiFiles] = useState<File[]>([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState<"success" | "error">("success");
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
    let allSiswa: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("user")
        .select("id, nisnip, nama, kelas")
        .eq("role", "siswa")
        .order("nama", { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error("FETCH SISWA ERROR:", error);
        break;
      }

      if (!data || data.length === 0) break;

      allSiswa = [...allSiswa, ...data];

      if (data.length < batchSize) break;
      from += batchSize;
    }

    const { data: jenis, error: jenisError } = await supabase
      .from("jenis_pelanggaran")
      .select("id, nama, poin");

    if (jenisError) {
      console.error("FETCH JENIS ERROR:", jenisError);
      return;
    }

    setListSiswa(allSiswa);
    setListJenis(jenis || []);
  };

  useEffect(() => {
    if (activeMenu === "input") {
      fetchDropdown();
      setInputSearch("");
      setSelectedSiswaId(null);
      setSelectedJenisId(null);
      setPoin(0);
      setKeterangan("");
      setBuktiFiles([]);
    }
  }, [activeMenu]);

  useEffect(() => {
    const selected = listJenis.find((j) => j.id === selectedJenisId);
    setPoin(selected ? selected.poin : 0);
  }, [selectedJenisId, listJenis]);

  const handleSubmit = async () => {
    if (!selectedSiswaId || !selectedJenisId) {
      setPopupType("error");
      setPopupMessage("Pilih siswa dan jenis pelanggaran!");
      setShowPopup(true);
      return;
    }

    setLoadingSubmit(true);

    try {
      let buktiUrls: string[] = [];

      for (const file of buktiFiles) {
        const filename = `${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("bukti-pelanggaran")
          .upload(filename, file);

        if (uploadErr) {
          console.error("UPLOAD ERROR:", uploadErr);
          setPopupType("error");
          setPopupMessage(`Upload gagal: ${uploadErr.message}`);
          setShowPopup(true);
          continue;
        }

        const { data } = supabase.storage
          .from("bukti-pelanggaran")
          .getPublicUrl(filename);

        buktiUrls.push(data.publicUrl);
      }

      const { data: pelanggaranData, error } = await supabase
        .from("pelanggaran")
        .insert({
          user_id: selectedSiswaId,
          jenis_id: selectedJenisId,
          poin,
          keterangan: keterangan || null,
          bukti: buktiUrls.length > 0 ? buktiUrls.join(",") : null,
        })
        .select()
        .single();

      if (error) throw error;

      const { data: siswaData } = await supabase
        .from("user")
        .select("nama, nisnip, kelas, perwalian")
        .eq("id", selectedSiswaId)
        .single();

      if (siswaData?.perwalian) {
        await supabase.from("notifikasi").insert({
          target_role: "walas",
          target_nisnip: siswaData.perwalian,
          tipe: "pelanggaran",
          message: `Siswa perwalian kamu (${siswaData.nama} · ${siswaData.kelas}) mendapat pelanggaran: ${selectedJenisData?.nama} sebesar ${poin} poin.`,
          is_read: false,
          sender_nisnip: userData?.nisnip ?? null,
          laporan_id: null,
        });
      }

      await supabase.from("notifikasi").insert({
        target_role: "siswa",
        target_nisnip: selectedSiswaData?.nisnip,
        message: `Kamu mendapat pelanggaran: ${selectedJenisData?.nama} (${poin} poin)`,
        is_read: false,
        tipe: "pelanggaran",
        sender_nisnip: userData?.nisnip,
      });

      setPopupType("success");
      setPopupMessage("Pelanggaran berhasil disimpan!");
      setShowPopup(true);

      setSelectedSiswaId(null);
      setSelectedJenisId(null);
      setPoin(0);
      setKeterangan("");
      setBuktiFiles([]);
      setInputSearch("");
      fetchKasus();

    } catch (err: any) {
      console.error(err);
      setPopupType("error");
      setPopupMessage(err?.message || "Terjadi kesalahan saat menyimpan data");
      setShowPopup(true);
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

  const filteredInputSiswa = listSiswa.filter(s =>
    s.nama.toLowerCase().includes(inputSearch.toLowerCase()) ||
    String(s.nisnip).includes(inputSearch)
  );
  const selectedSiswaData = listSiswa.find(s => s.id === selectedSiswaId);
  const selectedJenisData = listJenis.find(j => j.id === selectedJenisId);

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
  <div className="ip-fullpage">

    {/* PANEL KIRI */}
    <div className="ip-left-panel">
      <div className="ip-panel-header">
        <h2>Pilih Siswa</h2>
        <p className="abu-abu">Semua Jurusan</p>
        <div className="ip-search-wrap">
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            className="ip-search-input"
          />
        </div>
      </div>

      <div className="ip-siswa-list">
        {filteredInputSiswa.length === 0 ? (
          <div className="empty-state" style={{ padding: "30px 10px" }}>
            <p style={{ fontSize: 14 }}>Siswa tidak ditemukan</p>
          </div>
        ) : filteredInputSiswa.map(s => (
          <div
            key={s.id}
            className={`ip-siswa-item ${selectedSiswaId === s.id ? "ip-siswa-selected" : ""}`}
            onClick={() => setSelectedSiswaId(s.id)}
          >
            <div className="ip-s-ava">{getInitial(s.nama)}</div>
            <div className="ip-s-info">
              <div className="ip-s-name">{s.nama}</div>
              <div className="ip-s-meta">{s.nisnip}</div>
            </div>
            <span className="ip-s-kelas">{s.kelas}</span>
          </div>
        ))}
      </div>
    </div>

    {/* PANEL KANAN */}
    <div className="ip-right-panel">
      <div className="ip-right-scroll">

        {selectedSiswaData ? (
          <div className="ip-sel-badge">
            <div className="ip-sel-ava">{getInitial(selectedSiswaData.nama)}</div>
            <div>
              <h3>{selectedSiswaData.nama}</h3>
              <p className="abu-abu">{selectedSiswaData.nisnip} · {selectedSiswaData.kelas}</p>
            </div>
          </div>
        ) : (
          <div className="ip-placeholder">
            Pilih siswa untuk mulai input pelanggaran
          </div>
        )}

        <div className="ip-section-card">
          <div className="ip-section-label">Jenis Pelanggaran</div>
          <div className="ip-jenis-grid">
            {listJenis.map(j => (
              <button
                key={j.id}
                className={`ip-jenis-btn ${selectedJenisId === j.id ? "ip-jenis-active" : ""}`}
                onClick={() => setSelectedJenisId(j.id)}
              >
                <div className="ip-jb-name">{j.nama}</div>
                <div className="ip-jb-poin">{j.poin} poin</div>
              </button>
            ))}
          </div>
        </div>

        {poin > 0 && (
          <div className="ip-section-card">
            <div className="ip-section-label">Total Poin</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div className="ip-poin-num">{poin}</div>
              <div className="abu-abu" style={{ fontSize: 13 }}>poin pelanggaran</div>
            </div>
          </div>
        )}

        <div className="ip-section-card">
          <div className="ip-section-label">Keterangan</div>
          <textarea
            className="ip-textarea"
            placeholder="Tuliskan keterangan detail kejadian pelanggaran..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={3}
          />
        </div>

        <div className="ip-section-card">
          <div className="ip-section-label">Bukti Foto</div>
          <label className="ip-bukti-area">
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setBuktiFiles(prev => [...prev, ...files].slice(0, 5));
                e.target.value = "";
              }}
            />
            <div className="ip-bukti-icon">📷</div>
            <div className="ip-bukti-text">Tap untuk ambil foto / pilih dari galeri</div>
            <div className="ip-bukti-sub">PNG, JPG, HEIC · Maks 5 file</div>
          </label>

          {buktiFiles.length > 0 && (
            <div className="ip-preview-wrap">
              {buktiFiles.map((f, i) => (
                <div key={i} className="ip-preview-del">
                  <img src={URL.createObjectURL(f)} className="ip-preview-img" alt={`bukti-${i}`} />
                  <button onClick={() => setBuktiFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="ip-bottom-bar">
        <div className="ip-bottom-info">
          {selectedSiswaData && selectedJenisData
            ? <><b>{selectedSiswaData.nama}</b> · {selectedJenisData.nama} · <b>{poin} poin</b></>
            : <span>Pilih siswa dan jenis pelanggaran</span>
          }
        </div>
        <button
          className="ip-submit-btn"
          onClick={handleSubmit}
          disabled={loadingSubmit || !selectedSiswaId || !selectedJenisId}
        >
          {loadingSubmit ? "Menyimpan..." : "Simpan Pelanggaran"}
        </button>
      </div>
    </div>

  </div>
)}
            </>
          )}

        </main>
      </div>

      {/* MODALS tetap */}
      {showPopup && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>{popupType === "success" ? "Berhasil" : "Gagal"}</h2>
              <span className="close-btn" onClick={() => setShowPopup(false)}>×</span>
            </div>
            <div className="modal-body">
              <p>{popupMessage}</p>
            </div>
            <div className="modal-actions">
              <button
                className={popupType === "success" ? "btn-yes" : "btn-no"}
                style={popupType === "success" ? { background: "linear-gradient(90deg,#4C7CF3,#5C3ECF)" } : {}}
                onClick={() => setShowPopup(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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