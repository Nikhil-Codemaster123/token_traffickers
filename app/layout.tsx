import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broken heater → craftsman · centrix partner",
  description: "Token Traffickers · MAIN Summit hackathon · Reltix track",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <nav className="flex h-12 items-center gap-5 border-b border-slate-200 bg-white px-4 text-sm">
          <Link href="/" className="font-semibold">
            Token Traffickers <span className="font-normal text-slate-400">· Reltix track</span>
          </Link>
          <Link href="/line" className="text-slate-600 hover:text-slate-900">Tenant call</Link>
          <Link href="/centrix" className="text-slate-600 hover:text-slate-900">centrix inbox</Link>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
