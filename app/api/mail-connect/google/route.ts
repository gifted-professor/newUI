import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/auth/signin", url.origin));
  }

  return NextResponse.redirect(
    new URL(`/mail-connect/google/callback?email=${encodeURIComponent(session.user.email)}`, url.origin),
  );
}
