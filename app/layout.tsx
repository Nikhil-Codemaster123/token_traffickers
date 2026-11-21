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
      <body className="flex min-h-full flex-col bg-slate-50 text-sm leading-6 text-slate-700 tabular-nums">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 sm:h-16 sm:px-6 sm:py-0 lg:px-8">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold tracking-tight text-slate-900 sm:gap-3">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-end justify-center gap-0.5 rounded-lg bg-indigo-600 pb-2 shadow-xs">
                <span className="h-2 w-1 rounded-t-xs bg-white/75" />
                <span className="h-4 w-1 rounded-t-xs bg-white" />
                <span className="h-3 w-1 rounded-t-xs bg-white/90" />
              </span>
              <span className="leading-5">Token Traffickers <span className="block text-xs font-normal tracking-normal text-slate-500 sm:inline sm:text-sm">· Reltix track</span></span>
            </Link>
            <div className="flex items-center text-xs sm:gap-1 sm:text-sm">
              <Link href="/line" className="nav-line inline-flex h-11 items-center rounded-lg px-2 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-700 sm:px-3">Tenant call</Link>
              <Link href="/centrix" className="nav-centrix inline-flex h-11 items-center rounded-lg px-2 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-700 sm:px-3">centrix inbox</Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
