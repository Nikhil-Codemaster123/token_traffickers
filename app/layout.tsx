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
          <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-2 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold tracking-tight text-slate-950 sm:gap-3">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-900 text-white">
                <span className="building-mark" />
              </span>
              <span className="leading-5 sm:text-base">Token Traffickers <span className="block text-xs font-normal tracking-normal text-slate-500 sm:ml-1 sm:inline sm:text-sm">· Reltix track</span></span>
            </Link>
            <div className="flex self-stretch text-xs font-medium text-slate-600 sm:gap-4 sm:text-sm">
              <Link href="/line" className="workspace-tab nav-line transition-colors">Tenant call</Link>
              <Link href="/centrix" className="workspace-tab nav-centrix transition-colors">centrix inbox</Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
