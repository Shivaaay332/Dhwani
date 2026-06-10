import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhwani Premium",
  description: "Advanced Full-Stack Music Player",
  manifest: "/manifest.json",
  themeColor: "#d946ef",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Yahan html aur body dono par suppressHydrationWarning lagana zaroori hai
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-black text-white">
        {children}
      </body>
    </html>
  );
}