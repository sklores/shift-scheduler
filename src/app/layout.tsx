import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  themeColor: "#1f1b16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-[#f5f3ee] text-[#1a1916] antialiased">
        {children}
      </body>
    </html>
  );
}
