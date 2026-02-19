import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CMCRank.ai — CMC Rank Tracker & Analyzer",
  description: "Track cryptocurrency performance through CoinMarketCap ranking over time. AI-powered research reveals what drives token performance.",
  keywords: ["cryptocurrency", "coinmarketcap", "rank tracker", "crypto analytics", "AI research"],
  authors: [{ name: "Alfred Ivory" }],
  openGraph: {
    title: "CMCRank.ai — CMC Rank Tracker & Analyzer",
    description: "Track cryptocurrency performance through CoinMarketCap ranking over time.",
    url: "https://cmcrank.ai",
    siteName: "CMCRank.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CMCRank.ai — CMC Rank Tracker & Analyzer",
    description: "Track cryptocurrency performance through CoinMarketCap ranking over time.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
