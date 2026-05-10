"use client";

import "./pembina.css";
import LoadingScreen from "../components/LoadingScreen";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Page = "home" | "siswa" | "kasus" | "input";

export default function PembinaPage() {
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>("home");

  const [showSetting, setShowSetting] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // Notif
  const [notifCount, setNotifCount] = useState(0);

  // Data Siswa / Kasus
  const [dataSiswa, setDataSiswa] = useState<any[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [dataKasus, setDataKasus] = useState<any[]>([]);
  const [loadingKasus, setLoadingKasus] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;
  const [totalData, setTotalData] = useState(0);

  // Dashboard
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [sp1, setSp1] = useState(0);
  const [sp2, setSp2] = useState(0);
  const [tindakLanjut, setTindakLanjut] = useState(0);

  // Input pelanggaran
  const [listSiswa, setListSiswa] = useState<any[]>([]);
  const [listJenis, setListJenis] = useState<any[]>([]);
  const [inputSearch, setInputSearch] = useState("");
  const [selectedSiswa, setSelectedSiswa] = useState<number | null>(null);
  const [selectedJenis, setSelectedJenis] = useState<number | null>(null);
  const [poin, setPoin] = useState(0);
  const [keterangan, setKeterangan] = useState("");
  const [bukti, setbukti] = useState<File[]>([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState<"success" | "error">("success");

  // ================= AUTH =================
  // Sama seperti admin: pakai /api/auth/session untuk verifikasi cookie,
  // lalu fetch FULL user data dari Supabase agar field jurusan, nisnip, dll tetap ada
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // 1. Cek session cookie (sama persis dengan admin)
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const sessionData = await res.json();

        if (!sessionData.user || sessionData.user.role !== "pembina") {
          router.replace("/login");
          return;
        }

        // 2. Fetch FULL user data dari Supabase berdasarkan nisnip dari session
        //    (ini yang bikin data jurusan, kelas, dll tetap terhubung)
        const nisnip = sessionData.user.nisnip;
        const { data: fullUser, error } = await supabase
          .from("user")
          .select("*")
          .eq("nisnip", nisnip)
          .single();

        if (error || !fullUser) {
          console.error("Fetch full user error:", error);
          router.replace("/login");
          return;
        }

        setUserData(fullUser);
      } catch (error) {
        console.error("Pembina session check error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  // ================= NOTIF COUNT =================
  const fetchNotifCount = async () => {
    if (!userData) return;
    const { count, error } = await supabase
      .from("notifikasi")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("target_role", "pembina");

    if (!error) setNotifCount(count || 0);
  };

  useEffect(() => {
    if (userData) fetchNotifCount();
  }, [userData]);

  // ================= DASHBOARD =================
  const fetchDashboard = async () => {
    if (!userData) return;

    const { data: siswaList } = await supabase
      .from("user")
      .select("id")
      .eq("jurusan", userData.jurusan)
      .eq("role", "siswa");

    const siswaIds = (siswaList || []).map((s: any) => s.id);
    setTotalSiswa(siswaIds.length);
    if (siswaIds.length === 0) return;

    const { data: pelanggaran } = await supabase
      .from("pelanggaran")
      .select("user_id, poin")
      .in("user_id", siswaIds);

    const mapPoin: Record<string, number> = {};
    (pelanggaran || []).forEach((item: any) => {
      mapPoin[item.user_id] = (mapPoin[item.user_id] || 0) + item.poin;
    });

    let sp1Count = 0, sp2Count = 0, tindakCount = 0;
    Object.values(mapPoin).forEach((total: any) => {
      if (total >= 150) tindakCount++;
      else if (total >= 100) sp2Count++;
      else if (total >= 50) sp1Count++;
    });

    setSp1(sp1Count);
    setSp2(sp2Count);
    setTindakLanjut(tindakCount);
  };

  // ================= FETCH SISWA =================
  const fetchSiswa = async () => {
    if (!userData) return;
    setLoadingSiswa(true);
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("user")
      .select("nama, nisnip, kelas", { count: "exact" })
      .eq("jurusan", userData.jurusan)
      .eq("role", "siswa");

    if (search) query = query.or(`nama.ilike.%${search}%,nisnip.ilike.%${search}%`);

    const { data, count } = await query.range(from, to);
    setDataSiswa(data || []);
    setTotalData(count || 0);
    setLoadingSiswa(false);
  };

  // ================= FETCH KASUS =================
  const fetchKasus = async () => {
    if (!userData) return;
    setLoadingKasus(true);
    const from = page * limit;
    const to = from + limit - 1;

    const { data: siswaList } = await supabase
      .from("user")
      .select("id")
      .eq("jurusan", userData.jurusan)
      .eq("role", "siswa");

    const siswaIds = (siswaList || []).map((s: any) => s.id);
    if (siswaIds.length === 0) {
      setDataKasus([]);
      setTotalData(0);
      setLoadingKasus(false);
      return;
    }

    let query = supabase
      .from("pelanggaran")
      .select(`
        id,
        poin,
        bukti,
        created_at,
        user:user_id!inner(nisnip, nama, kelas),
        jenis_pelanggaran:jenis_id(id, nama)
      `, { count: "exact" })
      .in("user_id", siswaIds);

    if (search) {
      query = query.or(
        `nama.ilike.%${search}%,nisnip.ilike.%${search}%`,
        { foreignTable: "user" }
      );
    }

    const { data, count, error } = await query.range(from, to);
    if (error) {
      console.error("FETCH KASUS ERROR:", error.message, error.details);
      setDataKasus([]);
      setTotalData(0);
      setLoadingKasus(false);
      return;
    }

    setDataKasus(data || []);
    setTotalData(count || 0);
    setLoadingKasus(false);
  };

  // ================= DROPDOWN INPUT =================
  const fetchDropdown = async () => {
    if (!userData) return;

    const { data: siswa, error: siswaError } = await supabase
      .from("user")
      .select("id, nisnip, nama, kelas")
      .eq("jurusan", userData.jurusan)
      .eq("role", "siswa")
      .order("nama", { ascending: true });

    const { data: jenis, error: jenisError } = await supabase
      .from("jenis_pelanggaran")
      .select("id, nama, poin");

    if (siswaError || jenisError) {
      console.error("FETCH DROPDOWN ERROR:", siswaError || jenisError);
      setPopupType("error");
      setPopupMessage("Gagal memuat data");
      setShowPopup(true);
      return;
    }

    setListSiswa(siswa || []);
    setListJenis(jenis || []);
  };

  useEffect(() => {
    if (!userData) return;
    fetchDashboard();

    const channel = supabase
      .channel("pembina-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user" }, fetchDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "pelanggaran" }, fetchDashboard)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    if (activePage === "siswa") fetchSiswa();
    else if (activePage === "kasus") fetchKasus();
  }, [userData, page, search, activePage]);

  useEffect(() => {
    if (activePage === "input") fetchDropdown();
    setInputSearch("");
    setSelectedSiswa(null);
    setSelectedJenis(null);
    setPoin(0);
    setKeterangan("");
    setbukti([]);
  }, [activePage]);

  useEffect(() => {
    const selected = listJenis.find((j) => j.id === selectedJenis);
    setPoin(selected ? selected.poin : 0);
  }, [selectedJenis, listJenis]);

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (!selectedSiswa || !selectedJenis) {
      setPopupType("error");
      setPopupMessage("Pilih siswa dan jenis pelanggaran!");
      setShowPopup(true);
      return;
    }

    setLoadingSubmit(true);

    try {
      let buktiUrls: string[] = [];

      for (const file of bukti) {
        const filename = `${Date.now()}_${file.name}`;

        const { error: uploadErr } = await supabase.storage
          .from("bukti-pelanggaran")
          .upload(filename, file);

        if (uploadErr) {
          console.error("UPLOAD ERROR:", uploadErr);
          setPopupType("error");
          setPopupMessage(`Upload gagal: ${uploadErr.message || "Tidak dapat mengunggah file"}`);
          setShowPopup(true);
          continue;
        }

        const { data } = supabase.storage
          .from("bukti-pelanggaran")
          .getPublicUrl(filename);

        buktiUrls.push(data.publicUrl);
      }

      // Pembina → masuk laporan_pelanggaran (pending, menunggu admin)
      const siswaData = listSiswa.find(s => s.id === selectedSiswa);
      if (!siswaData) {
        setPopupType("error");
        setPopupMessage("Siswa tidak ditemukan!");
        setShowPopup(true);
        return;
      }

      const { data: laporanData, error: laporanError } = await supabase
        .from("laporan_pelanggaran")
        .insert({
          nisnip: siswaData.nisnip,
          jenis_id: selectedJenis,
          poin,
          pelapor_nisnip: userData.nisnip,
          bukti: buktiUrls.join(","),
          keterangan,
        })
        .select()
        .single();

      if (laporanError) throw laporanError;

      const { data: siswaDetail } = await supabase
        .from("user")
        .select("nama, nisnip, kelas, perwalian")
        .eq("id", selectedSiswa)
        .single();

      if (siswaDetail?.perwalian) {
        await supabase.from("notifikasi").insert({
          target_role: "walas",
          target_nisnip: siswaDetail.perwalian,
          tipe: "pelanggaran",
          message: `Siswa perwalian kamu (${siswaDetail.nama} · ${siswaDetail.kelas}) mendapat pelanggaran: ${selectedJenisData?.nama} sebesar ${poin} poin.`,
          is_read: false,
          sender_nisnip: userData?.nisnip ?? null,
          laporan_id: laporanData.id,
        });
      }

      // Kirim notifikasi ke admin
      await supabase.from("notifikasi").insert({
        target_role: "admin",
        message: "Pelanggaran baru diantrian",
        is_read: false,
        laporan_id: laporanData.id,
      });

      setPopupType("success");
      setPopupMessage("Pelanggaran berhasil disimpan! Menunggu persetujuan admin.");
      setShowPopup(true);

      setSelectedSiswa(null);
      setSelectedJenis(null);
      setPoin(0);
      setKeterangan("");
      setbukti([]);
      setInputSearch("");

    } catch (err: any) {
      console.error("HANDLE SUBMIT ERROR:", err);

      setPopupType("error");
      setPopupMessage(err?.message || "Terjadi kesalahan saat menyimpan data");
      setShowPopup(true);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ================= LOADING (sama dengan admin) =================
  if (loading) return <LoadingScreen message="Loading dashboard..." fullPage />;

  // ================= HELPERS =================
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

  const filteredInputSiswa = listSiswa.filter(s =>
    s.nama.toLowerCase().includes(inputSearch.toLowerCase()) ||
    s.nisnip.includes(inputSearch)
  );

  const selectedSiswaData = listSiswa.find(s => s.id === selectedSiswa);
  const selectedJenisData = listJenis.find(j => j.id === selectedJenis);

  return (
    <div className="pembina-container">

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
            onClick={() => { setSearch(""); setPage(0); setActivePage("siswa"); }}
          >
            <img src="/assets/img/data siswa.png" className="icon" />
            <span>Data Siswa</span>
          </div>
          <div
            className={`menu-item ${activePage === "kasus" ? "active" : ""}`}
            onClick={() => { setSearch(""); setPage(0); setActivePage("kasus"); }}
          >
            <img src="/assets/img/kasus.png" className="icon" />
            <span>Data Pelanggaran</span>
          </div>
          <div
            className={`menu-item ${activePage === "input" ? "active" : ""}`}
            onClick={() => setActivePage("input")}
          >
            <img src="/assets/img/input pelanggaran.png" className="icon" />
            <span>Input Pelanggaran</span>
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
          <div className="topbar-right">
            <div
              className="notif-wrapper"
              onClick={() => router.push("/pembina/notifikasi")}
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
                <span className="role">Pembina ({userData?.jurusan})</span>
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
                <p className="abu-abu">
                  Selamat datang kembali — Pembina Jurusan <b>{userData.jurusan}</b>
                </p>
              </div>

              <div className="dashboard-cards">
                <div className="stat-card">
                  <div className="icon-box blue">
                    <img src="/assets/img/icon-siswa.png" />
                  </div>
                  <h2>{totalSiswa}</h2>
                  <p>Total Siswa Jurusan {userData.jurusan}</p>
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

              <footer className="page-footer">© Copyright 2026</footer>
            </div>
          )}

          {/* ======== DATA SISWA ======== */}
          {activePage === "siswa" && (
            <div className="home-container">
              <button className="back-btn" onClick={() => setActivePage("home")}>
                ‹ Kembali
              </button>
              <div className="section-header">
                <h2 className="page-title">Data Siswa — Jurusan {userData.jurusan}</h2>
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
                <div className="empty-state"><p>Data tidak ditemukan</p></div>
              ) : (
                <div className="siswa-container">
                  {dataSiswa.map((item, i) => (
                    <div key={item.nisnip || i} className="siswa-card">
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

          {/* ======== DATA KASUS ======== */}
          {activePage === "kasus" && (
            <div className="home-container">
              <button className="back-btn" onClick={() => setActivePage("home")}>
                ‹ Kembali
              </button>
              <div className="section-header">
                <h2 className="page-title">Data Pelanggaran — Jurusan {userData.jurusan}</h2>
                <input
                  type="text"
                  placeholder="Cari NIS atau nama siswa..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="search-input"
                />
              </div>

              {loadingKasus ? (
                <p className="loading-text">Loading Data Pelanggaran...</p>
              ) : dataKasus.length === 0 ? (
                <div className="empty-state"><p>Data tidak ditemukan</p></div>
              ) : (
                <div className="siswa-container">
                  {dataKasus.map((item, i) => (
                    <div key={item.id || i} className="siswa-card">
                      <div className="siswa-avatar">{getInitial(item.user?.nama)}</div>
                      <div className="siswa-info">
                        <h3>{item.user?.nama || "Tidak diketahui"}</h3>
                        <p>NIS: {item.user?.nisnip}</p>
                        <span className="kelas">{item.user?.kelas}</span>
                        <p className="kasus-text">
                          Pelanggaran: <b>{item.jenis_pelanggaran?.nama || "-"}</b>
                        </p>
                        <p className="poin-text">Poin: <b>{item.poin}</b></p>
                        {item.bukti && <p className="bukti-text">Bukti: {item.bukti}</p>}
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

          {/* ======== INPUT PELANGGARAN ======== */}
          {activePage === "input" && (
            <div className="ip-fullpage">

              {/* PANEL KIRI */}
              <div className="ip-left-panel">
                <div className="ip-panel-header">
                  <h2>Pilih Siswa</h2>
                  <p className="abu-abu">Jurusan {userData.jurusan}</p>
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
                      className={`ip-siswa-item ${selectedSiswa === s.id ? "ip-siswa-selected" : ""}`}
                      onClick={() => setSelectedSiswa(s.id)}
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
                          className={`ip-jenis-btn ${selectedJenis === j.id ? "ip-jenis-active" : ""}`}
                          onClick={() => setSelectedJenis(j.id)}
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
                          setbukti(prev => [...prev, ...files].slice(0, 5));
                          e.target.value = "";
                        }}
                      />
                      <div className="ip-bukti-icon">📷</div>
                      <div className="ip-bukti-text">Tap untuk ambil foto / pilih dari galeri</div>
                      <div className="ip-bukti-sub">PNG, JPG, HEIC · Maks 5 file</div>
                    </label>

                    {bukti.length > 0 && (
                      <div className="ip-preview-wrap">
                        {bukti.map((f, i) => (
                          <div key={i} className="ip-preview-del">
                            <img src={URL.createObjectURL(f)} className="ip-preview-img" alt={`bukti-${i}`} />
                            <button onClick={() => setbukti(prev => prev.filter((_, idx) => idx !== i))}>×</button>
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
                    disabled={loadingSubmit || !selectedSiswa || !selectedJenis}
                  >
                    {loadingSubmit ? "Menyimpan..." : "Simpan Pelanggaran"}
                  </button>
                </div>
              </div>

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

      {/* MODAL LOGOUT — sama persis dengan admin */}
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
                onClick={() => setShowPopup(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}