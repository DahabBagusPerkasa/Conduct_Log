"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {

  useEffect(() => {

    const igHeader = document.querySelector(".ig-header");
    const igList = document.getElementById("instagramList");

    if (igHeader && igList) {
      igHeader.addEventListener("click", () => {
        igList.style.display =
          igList.style.display === "flex" ? "none" : "flex";
      });
    }

    const searchInput = document.getElementById("searchInput") as HTMLInputElement;

    let firstMatch: HTMLElement | null = null;

  if (searchInput) {

    searchInput.addEventListener("input", () => {
      const keyword = searchInput.value.toLowerCase();
      const elements = document.querySelectorAll("p, h3, li");

      firstMatch = null;

      elements.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        const text = el.textContent?.toLowerCase() || "";

        el.style.background = "transparent";

        if (!keyword) return;

        if (text.includes(keyword)) {
          el.style.background = "yellow";

          if (!firstMatch) {
            firstMatch = el;
          }
        }
      });
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();

        if (firstMatch) {
          firstMatch.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    });

  }
}, []);

  return (
    <div style={{ backgroundColor: "#DCEEFE" }}>

      {/* NAVBAR */}
      <nav className="navbar">

        <div className="nav-left">
          <img src="/assets/img/LogoSMKNHome.png" className="logo-left" />
          <span className="logo-x">x</span>
          <img src="/assets/img/LogoCL.png" className="logo-right" />
        </div>

        <div className="nav-search">
          <input type="text" id="searchInput" placeholder="Search ..." />
        </div>

        <div className="nav-menu">

          <a href="#sambutan" className="nav-item active">
            <img src="/assets/img/LogoHome.png" className="menu-icon" />
            <span>Home</span>
          </a>

          <a href="#about">About Us</a>
          <a href="#contact">Contact Us</a>

          <Link href="/login">
            <button className="nav-login-btn">Login</button>
          </Link>

        </div>

      </nav>

      {/* HERO */}
      <section className="hero">
        <img src="/assets/img/LatarbelakangSMKNHome.png" className="hero-bg" />

        <div className="hero-content">
          <h1 className="hero-title">
            WELCOME TO CONDUCT LOG SMKN 1 CIBINONG
          </h1>
          <p className="hero-subtitle">
            Bersama Junjung Tinggi Kedisiplinan
          </p>
        </div>
      </section>

      {/* SAMBUTAN */}
      <section id="sambutan" className="sambutan-section">

        <h2 className="sambutan-title">
          <span className="line"></span>
          Sambutan
          <span className="line"></span>
        </h2>

        <div className="sambutan-card">

          <div className="sambutan-image">
            <img src="/assets/img/BpKepalaSekolah.png" />
          </div>

          <div className="sambutan-content">
            <h3>
              Kepala Sekolah
              <br />
              SMKN 1 Cibinong
            </h3>

            <p className="italic">
              Assalamu’alaikum Warahmatullahi Wabarakatuh
            </p>

            <p>
              Melalui website resmi sekolah ini, kami memperkenalkan Kepala
              Sekolah kami, <strong>Sugiyo S.Pd., M.Pd.</strong>, sebagai sosok
              pemimpin yang berdedikasi dalam memajukan pendidikan dan membangun
              generasi berkarakter.
            </p>

            <p>
              Website ini menjadi salah satu bentuk transparansi serta sarana
              komunikasi antara sekolah, peserta didik, orang tua, dan
              masyarakat.
            </p>

            <p>
              Kami berharap website ini dapat menjadi jembatan kolaborasi demi
              kemajuan sekolah ke depan.
            </p>
          </div>

        </div>
      </section>

      {/* ABOUT HEADER */}
      <section className="about-header">
        <div className="about-overlay">
          <h2 className="about-title">
            <span className="about-line"></span>
            About Us
            <span className="about-line"></span>
          </h2>
        </div>
      </section>

      <div className="about-desc">
        Website ini dibuat untuk mempermudah pengelolaan pelanggaran siswa
        dan meningkatkan transparansi dalam pencatatannya.
      </div>

      {/* TIM */}
      <section id="about" className="about-section">

        <div className="about-card tim-card">

          <div className="about-logo">
            <img src="/assets/img/LogoCL.png" />
          </div>

          <div className="about-content">

            <div className="banner-wrapper">
              <img src="/assets/img/Banner Tim.png" className="banner-img" />
            </div>

            <p className="about-text">
              Tim Galactic yang beranggotakan 3 orang :
            </p>

            <ul className="about-list">
              <li>Afdeylah Panca</li>
              <li>Dahab Bagus Perkasa</li>
              <li>Naiy Tri Desianti</li>
            </ul>

          </div>
        </div>
      </section>

      {/* JURUSAN */}
      <section className="about-section">
        <div className="about-card jurusan-card">

          <div className="about-content">
            <div className="banner-wrapper">
              <img src="/assets/img/Banner Jurusan.png" className="banner-img" />
            </div>

            <p className="about-text">
              Rekayasa Perangkat Lunak (RPL) adalah jurusan yang mempelajari
              tentang pengembangan perangkat lunak seperti aplikasi, website,
              dan sistem informasi.
            </p>
          </div>

          <div className="about-logo">
            <img src="/assets/img/LogoRPLHome.png" />
          </div>

        </div>
      </section>

      {/* SEKOLAH */}
      <section className="about-section">
        <div className="about-card sekolah-card">

          <div className="about-logo">
            <img src="/assets/img/LogoSMKN.png" />
          </div>

          <div className="about-content">

            <div className="banner-wrapper">
              <img src="/assets/img/Banner Sekolah.png" className="banner-img" />
            </div>

            <p className="about-text">
              SMKN 1 Cibinong merupakan sekolah kejuruan yang berfokus pada
              pengembangan keterampilan siswa di bidang teknologi dan
              kewirausahaan.
            </p>

          </div>

        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact-section">

        <h2 className="contact-title">
          <span className="contact-line"></span>
          Contact Us
          <span className="contact-line"></span>
        </h2>

        <div className="contact-container">

          <div className="contact-card">
            <div className="contact-icon">
              <img src="/assets/img/Icon Contact.png" />
            </div>
            <div>
              <h3>Call Us</h3>
              <p>+62 812-3456-7890</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <img src="/assets/img/Icon Email.png" />
            </div>
            <div>
              <h3>Email Us</h3>
              <p>conductlog@gmail.com</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <img src="/assets/img/Icon Visit.png" />
            </div>
            <div>
              <h3>Visit Us</h3>
              <p>SMKN 1 Cibinong</p>
            </div>
          </div>

          <div className="contact-card instagram-card">
            <div className="contact-icon">
              <img src="/assets/img/Icon Instagram.png" />
            </div>

            <div className="instagram-content">
              <h3 className="ig-header">Instagram</h3>

              <div className="instagram-list" id="instagramList">
                <a href="https://www.instagram.com/dahabbagus_p/" target="_blank">@dahabbagus_p</a>
                <a href="https://www.instagram.com/nyy_3d/" target="_blank">@nyy_3d</a>
                <a href="https://www.instagram.com/afdylhpnc/" target="_blank">@afdylhpnc</a>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}