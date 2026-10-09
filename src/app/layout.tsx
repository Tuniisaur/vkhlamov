import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const customTitleFont = localFont({
  src: "./fonts/font.woff2",
  variable: "--font-title-custom",
  weight: "100 900",
  display: "swap",
  preload: true,
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

// Inline Base64 Data URI of VK favicon (eliminates network requests, browser SQLite cache, and Vercel build cache)
const VK_FAVICON_DATA_URI =
  "data:image/png;base64,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";

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
      { url: VK_FAVICON_DATA_URI, type: "image/png" },
      { url: "/icon-v3.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-v3.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: VK_FAVICON_DATA_URI,
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
      <head>
        <link rel="icon" type="image/png" href={VK_FAVICON_DATA_URI} />
        <link rel="shortcut icon" href={VK_FAVICON_DATA_URI} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var dataUri = "${VK_FAVICON_DATA_URI}";
                  var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
                  link.type = 'image/png';
                  link.rel = 'shortcut icon';
                  link.href = dataUri;
                  document.getElementsByTagName('head')[0].appendChild(link);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#070707] text-[#ececec] font-sans antialiased overflow-x-hidden selection:bg-[#e0fe10] selection:text-black">
        <SiteDataProvider>{children}</SiteDataProvider>
      </body>
    </html>
  );
}
