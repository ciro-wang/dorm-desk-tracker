import type { Metadata } from "next";
import { Inter, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

const shippori = Shippori_Mincho({
  variable: "--font-heading",
  weight: ["500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dorm & Desk Tracker",
  description: "Private Black Friday and Boxing Week deal tracker",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${shippori.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
