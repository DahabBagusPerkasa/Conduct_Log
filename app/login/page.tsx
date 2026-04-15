"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [nisnip, setNisnip] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data.user?.role === "admin") {
          router.replace("/admin");
        } else if (data.user?.role === "siswa") {
          router.replace("/siswa");
        }
      } catch (error) {
        // ignore and allow login
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ nisnip, password }),
      });

      const result = await response.json();
      if (!response.ok || !result.user) {
        setErrorMsg("NIS/NIP atau Password Salah");
        setLoading(false);
        return;
      }

      if (result.user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/siswa");
      }
    } catch (error) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">

        <div className="logo-area">
          <img src="/assets/img/LogoCL.png" />
          <div className="logo-text">
            <h1>Conduct Log</h1>
            <p>Behavior Portal</p>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <label>NIS/NIP :</label>

          {errorMsg && (
            <p style={{ color: "red", marginBottom: "10px" }}>
              {errorMsg}
            </p>
          )}

          <input onChange={(e) => setNisnip(e.target.value)} />

          <label>Password :</label>
          <input
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="login-page-btn" disabled={loading}>
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

      </div>

      <div className="login-right">
        <img src="/assets/img/t1.png" className="triangle t1" />
        <img src="/assets/img/t2.png" className="triangle t2" />
        <img src="/assets/img/t3.png" className="triangle t3" />
        <img src="/assets/img/t4.png" className="triangle t4" />
      </div>
    </div>
  );
}