import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://datacenter.forum"),
  title: {
    default: "DataCenter.forum — Data Center Project Intelligence",
    template: "%s | DataCenter.forum"
  },
  description: "Search source-linked data-center projects, companies, capacity, investment, construction status, and market intelligence.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "DataCenter.forum",
    url: "/",
    title: "DataCenter.forum — Data Center Project Intelligence",
    description: "Search source-linked data-center projects, companies, capacity, investment, construction status, and market intelligence."
  },
  twitter: {
    card: "summary_large_image",
    title: "DataCenter.forum — Data Center Project Intelligence",
    description: "Search source-linked data-center projects, companies, capacity, investment, construction status, and market intelligence."
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
