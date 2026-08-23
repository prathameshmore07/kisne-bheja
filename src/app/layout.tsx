import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Kisne Bheja : UPI Order Matching",
  description: "Your payment arrived. We find the order it belongs to.",
  icons: {
    icon: "/brand/favicon/favicon.ico",
    shortcut: "/brand/favicon/favicon.ico",
    apple: "/brand/favicon/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/brand/favicon/favicon.ico" />
        <link rel="shortcut icon" href="/brand/favicon/favicon.ico" />
        <link rel="apple-touch-icon" href="/brand/favicon/favicon.ico" />
      </head>
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
