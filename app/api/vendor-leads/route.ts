import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const vendor_id = String(form.get("vendor_id") ?? "").trim();
  const vendor_slug = String(form.get("vendor_slug") ?? "").trim();
  const requester_name = String(form.get("requester_name") ?? "").trim();
  const requester_email = String(form.get("requester_email") ?? "").trim().toLowerCase();
  const requester_company = String(form.get("requester_company") ?? "").trim() || null;
  const need = String(form.get("need") ?? "").trim();
  const consent_to_intro = form.get("consent_to_intro") === "yes";

  if (!vendor_id || !vendor_slug || !requester_name || !requester_email.includes("@") || need.length < 10 || !consent_to_intro) {
    return NextResponse.json({ error: "Invalid lead request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vendor_leads").insert({ vendor_id, requester_name, requester_email, requester_company, need, consent_to_intro });
  if (error) return NextResponse.json({ error: "Unable to submit request" }, { status: 500 });
  return NextResponse.redirect(new URL(`/vendors/${encodeURIComponent(vendor_slug)}?sent=1`, request.url), 303);
}
