import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("sessions")
    .select("nisnip, expired_at")
    .eq("token", token)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const expiredAt = new Date(session.expired_at).getTime();
  if (Number.isNaN(expiredAt) || expiredAt < Date.now()) {
    await supabaseServer.from("sessions").delete().eq("token", token);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data: user, error: userError } = await supabaseServer
    .from("user")
    .select("id, nisnip, nama, role, kelas")
    .eq("nisnip", session.nisnip)
    .single();

  if (userError || !user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user });
}
