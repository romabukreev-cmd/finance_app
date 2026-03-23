import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainNav } from "@/components/layout/main-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Финансы MVP",
  description: "Личный учет финансов: счета, операции и аналитика по месяцам",
  applicationName: "Финансы MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-muted/30">
        <MainNav />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
