import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { nisnip, password } = await request.json();

  if (!nisnip || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const { data: user, error } = await supabaseServer
    .from("user")
    .select("nisnip, nama, role")
    .eq("nisnip", nisnip)
    .eq("password", password)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = crypto.randomUUID();
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const insert = await supabaseServer.from("sessions").insert({
    nisnip: user.nisnip,
    token,
    expired_at: expiredAt,
  });

  if (insert.error) {
    return NextResponse.json({ error: "Unable to create session" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true, user });
  response.cookies.set("session_token", token, {
    httpOnly: true,
    secure: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
