"use server";

import { revalidatePath } from "next/cache";
import { requireRevenueAdmin } from "../../../lib/admin";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "listing";
}

export async function updateRevenueStatus(formData: FormData) {
  const { supabase, profile } = await requireRevenueAdmin();
  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const allowed: Record<string, Set<string>> = {
    vendor_applications: new Set(["new", "contacted", "approved", "rejected", "closed"]),
    sponsorship_inquiries: new Set(["new", "contacted", "proposal", "won", "lost", "closed"]),
    vendor_leads: new Set(["new", "accepted", "closed", "spam"]),
    job_posting_requests: new Set(["new", "contacted", "approved", "rejected", "published", "closed"]),
    opportunity_submissions: new Set(["new", "qualified", "matched", "rejected", "closed"]),
  };

  if (!allowed[table]?.has(status) || !id) throw new Error("Invalid status update");
  const patch: Record<string, unknown> = { status };
  if (["vendor_applications", "sponsorship_inquiries", "job_posting_requests", "opportunity_submissions"].includes(table)) {
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = profile.id;
  }
  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/revenue");
}

export async function approveVendorApplication(formData: FormData) {
  const { supabase, profile } = await requireRevenueAdmin();
  const id = String(formData.get("id") ?? "");
  const { data: app, error } = await supabase.from("vendor_applications").select("*").eq("id", id).single();
  if (error || !app) throw error ?? new Error("Vendor application not found");

  const slug = `${slugify(app.company_name)}-${id.slice(0, 6)}`;
  const plan = ["vendor", "featured", "founding_partner"].includes(app.requested_plan) ? app.requested_plan : "vendor";
  const { error: vendorError } = await supabase.from("vendors").upsert({
    slug,
    name: app.company_name,
    website: app.website,
    categories: app.categories ?? [],
    plan,
    status: "approved",
    is_verified: false,
    is_founding_partner: plan === "founding_partner",
  }, { onConflict: "slug" });
  if (vendorError) throw vendorError;

  const { error: updateError } = await supabase.from("vendor_applications").update({
    status: "approved",
    reviewed_at: new Date().toISOString(),
    reviewed_by: profile.id,
  }).eq("id", id);
  if (updateError) throw updateError;
  revalidatePath("/admin/revenue");
  revalidatePath("/vendors");
}

export async function publishJobRequest(formData: FormData) {
  const { supabase, profile } = await requireRevenueAdmin();
  const id = String(formData.get("id") ?? "");
  const { data: req, error } = await supabase.from("job_posting_requests").select("*").eq("id", id).single();
  if (error || !req) throw error ?? new Error("Job request not found");
  if (!req.apply_url) throw new Error("An apply URL is required before publishing");

  const slug = `${slugify(`${req.company_name}-${req.title}`)}-${id.slice(0, 6)}`;
  const { error: jobError } = await supabase.from("jobs").upsert({
    slug,
    company_name: req.company_name,
    title: req.title,
    location: req.location,
    compensation: req.compensation,
    description: req.description,
    apply_url: req.apply_url,
    plan: req.requested_plan,
    status: "published",
    published_at: new Date().toISOString(),
  }, { onConflict: "slug" });
  if (jobError) throw jobError;

  const { error: updateError } = await supabase.from("job_posting_requests").update({
    status: "published",
    reviewed_at: new Date().toISOString(),
    reviewed_by: profile.id,
  }).eq("id", id);
  if (updateError) throw updateError;
  revalidatePath("/admin/revenue");
  revalidatePath("/jobs");
}

export async function publishOpportunity(formData: FormData) {
  const { supabase, profile } = await requireRevenueAdmin();
  const id = String(formData.get("id") ?? "");
  const makePublic = formData.get("is_public") === "yes";
  const { data: req, error } = await supabase.from("opportunity_submissions").select("*").eq("id", id).single();
  if (error || !req) throw error ?? new Error("Opportunity submission not found");

  const { error: oppError } = await supabase.from("opportunities").insert({
    title: req.title,
    category: req.category,
    region: req.region,
    timeline: req.timeline,
    need: req.need,
    status: "open",
    is_verified: true,
    is_public: makePublic,
  });
  if (oppError) throw oppError;

  const { error: updateError } = await supabase.from("opportunity_submissions").update({
    status: "qualified",
    reviewed_at: new Date().toISOString(),
    reviewed_by: profile.id,
  }).eq("id", id);
  if (updateError) throw updateError;
  revalidatePath("/admin/revenue");
  revalidatePath("/opportunities");
}

export async function setVendorVerification(formData: FormData) {
  const { supabase, profile } = await requireRevenueAdmin();
  const vendorId = String(formData.get("vendor_id") ?? "");
  const checkType = String(formData.get("check_type") ?? "manual");
  const status = String(formData.get("status") ?? "pending");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!vendorId || !["website", "domain_email", "business_record", "reference", "manual"].includes(checkType) || !["pending", "passed", "failed"].includes(status)) throw new Error("Invalid verification");

  const { error } = await supabase.from("vendor_verifications").insert({
    vendor_id: vendorId,
    check_type: checkType,
    status,
    notes,
    checked_by: profile.id,
    checked_at: status === "pending" ? null : new Date().toISOString(),
  });
  if (error) throw error;

  if (status === "passed") {
    const { error: vendorError } = await supabase.from("vendors").update({ is_verified: true }).eq("id", vendorId);
    if (vendorError) throw vendorError;
  }
  revalidatePath("/admin/revenue");
  revalidatePath("/vendors");
}

export async function createSponsoredPlacement(formData: FormData) {
  const { supabase } = await requireRevenueAdmin();
  const sponsorName = String(formData.get("sponsor_name") ?? "").trim();
  const placement = String(formData.get("placement") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const targetUrl = String(formData.get("target_url") ?? "").trim() || null;
  const disclosureLabel = String(formData.get("disclosure_label") ?? "Sponsored").trim() || "Sponsored";
  if (!sponsorName || !placement || !headline) throw new Error("Sponsor, placement and headline are required");

  const { error } = await supabase.from("sponsored_content").insert({
    sponsor_name: sponsorName,
    placement,
    headline,
    body,
    target_url: targetUrl,
    disclosure_label: disclosureLabel,
    status: "draft",
  });
  if (error) throw error;
  revalidatePath("/admin/revenue");
}
