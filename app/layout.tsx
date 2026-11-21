import type { Metadata } from "next";
import Link from "next/link";
import { Icon, pageWidth } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broken heater → craftsman · centrix partner",
  description: "Token Traffickers · MAIN Summit hackathon · Reltix track",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-sm leading-6 text-slate-700 tabular-nums">
        <nav className="border-b border-slate-200/80 bg-white/85 backdrop-blur-lg">
          <div className={`${pageWidth} flex min-h-14 flex-wrap items-center justify-between gap-x-2`}>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold tracking-tight text-slate-950 sm:gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-900/5 ring-inset"><Icon name="building" /></span>
              <span className="leading-5 sm:text-base">Token Traffickers <span className="block text-xs font-normal tracking-normal text-slate-500 sm:ml-1 sm:inline sm:text-sm">· Reltix track</span></span>
            </Link>
            <div className="flex self-stretch text-xs font-medium text-slate-600 sm:gap-4 sm:text-sm">
              <Link href="/line" className="workspace-tab nav-line motion-safe:transition-colors motion-safe:duration-150">Tenant call</Link>
              <Link href="/centrix" className="workspace-tab nav-centrix motion-safe:transition-colors motion-safe:duration-150">centrix inbox</Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
