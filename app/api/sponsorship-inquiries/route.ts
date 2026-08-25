import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const row = {
    company_name: String(form.get("company_name") ?? "").trim(),
    contact_name: String(form.get("contact_name") ?? "").trim(),
    contact_email: String(form.get("contact_email") ?? "").trim().toLowerCase(),
    package: String(form.get("package") ?? "").trim() || null,
    budget: String(form.get("budget") ?? "").trim() || null,
    notes: String(form.get("notes") ?? "").trim()
  };
  if (!row.company_name || !row.contact_name || !row.contact_email.includes("@") || row.notes.length < 10) return NextResponse.json({error:"Invalid inquiry"},{status:400});
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("sponsorship_inquiries").insert(row);
  if (error) return NextResponse.json({error:"Unable to submit inquiry"},{status:500});
  return NextResponse.redirect(new URL("/advertise?sent=1", request.url),303);
}
