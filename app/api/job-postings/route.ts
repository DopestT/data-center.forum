import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const row = {
    company_name: String(form.get("company_name") ?? "").trim(),
    contact_name: String(form.get("contact_name") ?? "").trim(),
    contact_email: String(form.get("contact_email") ?? "").trim().toLowerCase(),
    title: String(form.get("title") ?? "").trim(),
    location: String(form.get("location") ?? "").trim() || null,
    compensation: String(form.get("compensation") ?? "").trim() || null,
    apply_url: String(form.get("apply_url") ?? "").trim() || null,
    description: String(form.get("description") ?? "").trim(),
    requested_plan: String(form.get("requested_plan") ?? "standard").trim()
  };
  if (!row.company_name || !row.contact_name || !row.contact_email.includes("@") || !row.title || row.description.length < 20) return NextResponse.json({error:"Invalid job submission"},{status:400});
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("job_posting_requests").insert(row);
  if (error) return NextResponse.json({error:"Unable to submit job"},{status:500});
  return NextResponse.redirect(new URL("/jobs?submitted=1", request.url),303);
}
