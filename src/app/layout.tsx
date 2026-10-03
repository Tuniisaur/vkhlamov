import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const customTitleFont = localFont({
  src: "../../public/font.otf",
  variable: "--font-title-custom",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#050505",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "VALERIY KHLAMOV // Motorsport & Automotive Videographer",
  description: "Official portfolio of Valerio Khlamov — Motorsport Director of Photography and Automotive Filmmaker. Based in Italy, available worldwide.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "VALERIY KHLAMOV // Motorsport & Automotive Videographer",
    description: "High-octane racing visuals, high-speed track pursuit and luxury automotive films by Valerio Khlamov.",
    images: ["/images/gt-night-race.jpg"],
  },
};

import { SiteDataProvider } from "@/context/SiteDataContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${customTitleFont.variable} dark scroll-smooth`}>
      <body className="bg-[#070707] text-[#ececec] font-sans antialiased overflow-x-hidden selection:bg-[#e0fe10] selection:text-black">
        <SiteDataProvider>{children}</SiteDataProvider>
      </body>
    </html>
  );
}
