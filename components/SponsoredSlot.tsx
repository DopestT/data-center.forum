import { createSupabaseServerClient } from "../lib/supabase/server";
import styles from "./SponsoredSlot.module.css";

type Sponsored = {
  id: string;
  sponsor_name: string;
  headline: string;
  body: string | null;
  target_url: string | null;
  disclosure_label: string;
};

export async function SponsoredSlot({ placement }: { placement: string }) {
  let item: Sponsored | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("sponsored_content")
      .select("id,sponsor_name,headline,body,target_url,disclosure_label")
      .eq("placement", placement)
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    item = data as Sponsored | null;
  } catch {
    return null;
  }

  if (!item) return null;

  return <aside className={styles.slot} aria-label={`${item.disclosure_label} content`}>
    <div className={styles.inner}>
      <div className={styles.copy}>
        <span className={styles.label}>{item.disclosure_label}</span>
        <h3>{item.headline}</h3>
        {item.body && <p>{item.body}</p>}
        <p className={styles.sponsor}>Paid for by {item.sponsor_name}</p>
      </div>
      {item.target_url && <a className={styles.cta} href={item.target_url} target="_blank" rel="sponsored noreferrer">Visit sponsor ↗</a>}
    </div>
  </aside>;
}
