"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [nisnip, setNisnip] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("nisnip", nisnip)
      .eq("password", password)
      .single();

    if (error || !data) {
      setErrorMsg("NIS/NIP atau Password Salah");
      setLoading(false);
      return;
    }

    localStorage.setItem("nisnip", data.nisnip);

    if (data.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/siswa");
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