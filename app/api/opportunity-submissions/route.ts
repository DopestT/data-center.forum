import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const row = {
    buyer_name: String(form.get("buyer_name") ?? "").trim(),
    buyer_email: String(form.get("buyer_email") ?? "").trim().toLowerCase(),
    buyer_company: String(form.get("buyer_company") ?? "").trim() || null,
    title: String(form.get("title") ?? "").trim(),
    category: String(form.get("category") ?? "").trim(),
    region: String(form.get("region") ?? "").trim() || null,
    timeline: String(form.get("timeline") ?? "").trim() || null,
    need: String(form.get("need") ?? "").trim(),
    consent_to_matching: form.get("consent_to_matching") === "yes"
  };
  if (!row.buyer_name || !row.buyer_email.includes("@") || !row.title || !row.category || row.need.length < 20 || !row.consent_to_matching) return NextResponse.json({error:"Invalid opportunity"},{status:400});
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("opportunity_submissions").insert(row);
  if (error) return NextResponse.json({error:"Unable to submit opportunity"},{status:500});
  return NextResponse.redirect(new URL("/opportunities?submitted=1", request.url),303);
}
