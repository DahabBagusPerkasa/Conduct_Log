"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SiswaPage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (!user) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(user);

    if (parsedUser.role !== "siswa") {
      router.push("/");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div>
      <h1>Halaman Siswa</h1>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}