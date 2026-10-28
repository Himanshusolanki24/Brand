import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

// The Brand Book's four registers: serif is the book itself (display and
// reviewed copy), sans runs the interface, mono is machine truth, Caveat is
// the hand in the margin.
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-serif",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Inkloom",
  description: "Proof your brand before the world does.",
  openGraph: {
    title: "Inkloom — proof your brand before the world does",
    description:
      "Every flag cites the clause it broke, every fix keeps your intent, and nothing ships without a human signature.",
    siteName: "Inkloom",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F4EC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plexSerif.variable} ${plexSans.variable} ${plexMono.variable} ${caveat.variable} antialiased`}
      >
        <a href="#app-main" className="skip-link">
          Skip to content
        </a>
        {/* If scripting never runs, motion never starts — show the final state. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}.tagword{opacity:1!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
