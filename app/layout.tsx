import "./globals.css";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata = {
  title: "vinext starter",
  description:
    "Minimal vinext app on Cloudflare Workers with live performance metrics.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
