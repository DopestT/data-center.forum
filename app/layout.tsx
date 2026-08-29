import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataCenter.forum",
  description: "The independent forum for data center infrastructure, power, construction, policy, finance and operations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
