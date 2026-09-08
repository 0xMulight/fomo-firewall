import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOMO Firewall",
  description:
    "An AI trading agent that stops you from chasing pumps. Binance Agent OS Mini Hackathon - Track A.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-terminal-bg font-mono text-terminal-text antialiased">
        {children}
      </body>
    </html>
  );
}
