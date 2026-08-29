import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "data-center.forum", timestamp: new Date().toISOString() });
}
