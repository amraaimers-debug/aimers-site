import "./globals.css";
import { Suspense } from "react";
import ThemeToggle from "./ThemeToggle";
import HeaderSearch from "./HeaderSearch";

export const metadata = {
  metadataBase: new URL("https://amar-khata-web-iota.vercel.app"),
  title: {
    default: "আমার খাতা — কবিতা ও গল্পের ঘর",
    template: "%s · আমার খাতা",
  },
  description: "কবিতা ও গল্পের একটি ব্যক্তিগত সংকলন",
  openGraph: {
    title: "আমার খাতা — কবিতা ও গল্পের ঘর",
    description: "কবিতা ও গল্পের একটি ব্যক্তিগত সংকলন",
    siteName: "আমার খাতা",
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body className="font-sans">
        <header
          className="sticky top-0 z-20"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <a href="/" className="flex items-center gap-2.5">
              <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
                <rect x="1" y="1" width="38" height="38" rx="6" stroke="#7C2233" strokeWidth="1.4" />
                <path
                  d="M20 12c-2.5-2.2-6-2.8-9-1.6v15.4c3-1.2 6.5-.6 9 1.6 2.5-2.2 6-2.8 9-1.6V10.4c-3-1.2-6.5-.6-9 1.6Z"
                  stroke="#B4872E" strokeWidth="1.6"
                />
                <path d="M20 12v15.4" stroke="#B4872E" strokeWidth="1.6" />
              </svg>
              <div>
                <div className="font-display text-xl leading-none">আমার খাতা</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>সাহিত্য পোর্টাল</div>
              </div>
            </a>
            <nav className="flex items-center gap-5 text-sm font-semibold">
              <a href="/" className="hover:text-[var(--maroon)]">হোম</a>
              <a href="/?type=কবিতা" className="hover:text-[var(--maroon)]">কবিতা</a>
              <a href="/?type=গল্প" className="hover:text-[var(--maroon)]">গল্প</a>
              <a href="/?type=দর্শন" className="hover:text-[var(--maroon)]">দর্শন</a>
              <a href="/?type=শায়েরি" className="hover:text-[var(--maroon)]">শায়েরি</a>
            </nav>
            <div className="flex items-center gap-3">
              <Suspense fallback={<div className="w-36 h-8" />}>
                <HeaderSearch />
              </Suspense>
              <ThemeToggle />
              <a
                href="/settings"
                className="text-sm font-semibold hover:text-[var(--maroon)]"
                title="প্রোফাইল ছবি বদলান"
              >
                প্রোফাইল
              </a>
              <a
                href="/publish"
                className="text-sm font-bold px-4 py-2 rounded"
                style={{ background: "var(--maroon)", color: "#fff" }}
              >
                লেখক লগইন
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>

        <footer style={{ borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
          <div
            className="max-w-5xl mx-auto px-6 py-6 text-center text-xs"
            style={{ color: "var(--muted)" }}
          >
            আমার খাতা © {new Date().getFullYear()} · সর্বস্বত্ব সংরক্ষিত। এখানে প্রকাশিত প্রতিটি লেখার অধিকার তার নিজ নিজ লেখকের।
          </div>
        </footer>
      </body>
    </html>
  );
}