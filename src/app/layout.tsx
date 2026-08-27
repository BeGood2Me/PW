import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/data/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const googleAnalyticsSnippet = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${site.googleAnalyticsId}');`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
  description: site.tagline,
  openGraph: {
    title: site.name,
    description: site.tagline,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-neutral-900">
        {/* Google tag (gtag.js) — static tags so crawlers see the exact snippet */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${site.googleAnalyticsId}`}
        />
        <script dangerouslySetInnerHTML={{ __html: googleAnalyticsSnippet }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
