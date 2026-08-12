import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// Render on-demand rather than statically — pages read live marketplace data,
// so we avoid coupling the build to database availability.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "LuxeMarket — A curated marketplace for premium goods",
    template: "%s · LuxeMarket",
  },
  description:
    "LuxeMarket is a multi-vendor marketplace connecting independent luxury makers with discerning buyers. Discover watches, leather goods, home, and more.",
  keywords: ["marketplace", "luxury", "multi-vendor", "ecommerce", "premium goods"],
  openGraph: {
    title: "LuxeMarket",
    description: "A curated multi-vendor marketplace for premium goods.",
    type: "website",
    images: ["/brand/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
