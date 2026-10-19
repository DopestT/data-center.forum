import type { ReactNode } from "react";
import Link from "next/link";
import { NewsChyron } from "./NewsChyron";

export async function PublicTopbar({ children }: { children?: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        {children ?? (
          <nav>
            <Link href="/database">Database</Link>
            <Link href="/changes">Changes</Link>
            <Link href="/intelligence">Data</Link>
            <Link href="/vendors">Companies</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/jobs">Jobs</Link>
            <Link href="/opportunities">Opportunities</Link>
          </nav>
        )}
      </header>
      <NewsChyron />
    </>
  );
}
