import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "vinext starter",
  description:
    "Minimal vinext app on Cloudflare Workers with live performance metrics.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
