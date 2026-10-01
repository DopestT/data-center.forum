import { NextRequest, NextResponse } from "next/server";

const LEGACY_HOSTS = new Set(["bigsignaltech.com", "www.bigsignaltech.com"]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (!host || !LEGACY_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.protocol = "https:";
  destination.host = "datacenter.forum";

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: "/:path*",
};
