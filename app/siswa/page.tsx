"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SiswaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!data.user || data.user.role !== "siswa") {
        router.push("/login");
        return;
      }

      setUserData(data.user);
      setLoading(false);
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
  };

  if (loading) {
    return <LoadingScreen message="Validating session..." fullPage />;
  }

  return (
    <div>
      <h1>Halaman Siswa</h1>
      {userData?.nama && <p>Selamat datang, {userData.nama}</p>}

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}