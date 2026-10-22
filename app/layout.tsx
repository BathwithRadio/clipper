import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeScript } from "@/components/clipper/theme-toggle";

export const metadata: Metadata = {
  title: "Clipper — At-home grooming in Seoul",
  description: "Book a thoughtful, at-home grooming visit for your favorite pet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[#f7f0e6] text-[#202321] antialiased">
        {children}
      </body>
    </html>
  );
}
