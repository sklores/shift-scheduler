import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Single font per the & done brief. Exposed as --font-sans; globals.css
// aliases --font-mono to the same family so existing markup keeps working.
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://schedule.anddone.ai"),
  title: {
    default: "&shift — Employee Scheduler",
    template: "%s · &shift",
  },
  description: "Build a week's schedule in a minute. A fast, keyboard-friendly employee scheduler with SMS publishing.",
  openGraph: {
    title: "&shift — Employee Scheduler",
    description: "Build a week's schedule in a minute.",
    siteName: "&shift",
    type: "website",
    url: "https://schedule.anddone.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "&shift — Employee Scheduler",
    description: "Build a week's schedule in a minute.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2c3a35",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-[#e4eded] text-[#2c3a35] antialiased">
        {children}
      </body>
    </html>
  );
}
