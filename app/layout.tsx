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
      <body className="flex min-h-full flex-col bg-[#B6C0CA] text-sm leading-6 text-black tabular-nums">
        <nav className="border-b border-white/20 bg-[#2C2456] text-white backdrop-blur-lg">
          <div className={`${pageWidth} flex min-h-14 flex-wrap items-center justify-between gap-x-2`}>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold tracking-tight text-slate-950 sm:gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#E49A72] text-[#2C2456] ring-1 ring-[#E49A72]/50 ring-inset"><Icon name="building" /></span>
              <span className="leading-5 text-[#E49A72] sm:text-base">centrix partner studio <span className="block text-xs font-normal tracking-normal text-white sm:ml-1 sm:inline sm:text-sm">· Reltix track</span></span>
            </Link>
            <div className="flex self-stretch text-xs font-medium text-white sm:gap-4 sm:text-sm">
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
