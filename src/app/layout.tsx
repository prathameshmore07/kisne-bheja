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
    icon: [
      { url: "/brand/favicon/favicon.ico" },
      { url: "/brand/favicon.ico" },
      { url: "/favicon.ico" },
    ],
    apple: "/brand/favicon/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
