"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [nisnip, setNisnip] = useState("");
  const [password, setPassword] = useState("");

const router = useRouter();

const handleLogin = async () => {
  const { data, error } = await supabase
    .from("user")
    .select("*")
    .eq("nisnip", nisnip)
    .eq("password", password)
    .single();

  if (error || !data) {
    alert("Login gagal!");
    return;
  }

  if (data.role === "admin") {
    router.push("/admin");
  } else if (data.role === "siswa") {
    router.push("/siswa");
  } else {
    alert("Role tidak dikenali!");
  }

  localStorage.setItem("user", JSON.stringify(data));
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
          <input onChange={(e) => setNisnip(e.target.value)} />

          <label>Password :</label>
          <input type="password" onChange={(e) => setPassword(e.target.value)} />

          <button className="login-page-btn">Login</button>
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