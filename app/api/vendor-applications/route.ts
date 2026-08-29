import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const company_name = String(form.get("company_name") ?? "").trim();
  const website = String(form.get("website") ?? "").trim() || null;
  const contact_name = String(form.get("contact_name") ?? "").trim();
  const contact_email = String(form.get("contact_email") ?? "").trim().toLowerCase();
  const category = String(form.get("category") ?? "").trim();
  const requested_plan = String(form.get("requested_plan") ?? "vendor").trim();
  const notes = String(form.get("notes") ?? "").trim();

  if (!company_name || !contact_name || !contact_email.includes("@") || !category || notes.length < 10) {
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vendor_applications").insert({
    company_name,
    website,
    contact_name,
    contact_email,
    categories: [category],
    requested_plan,
    notes
  });

  if (error) return NextResponse.json({ error: "Unable to submit application" }, { status: 500 });
  return NextResponse.redirect(new URL("/vendors?applied=1", request.url), 303);
}
