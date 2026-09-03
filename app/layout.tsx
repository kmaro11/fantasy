import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy",
  description: "Next.js + Tailwind + Biome starteris",
};

const nav = [
  { href: "/", label: "Pradžia" },
  { href: "/about", label: "Apie" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="lt" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold">
              Fantasy
            </Link>
            <ul className="flex gap-4 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{children}</main>

        <footer className="border-t border-neutral-200 px-6 py-6 text-sm text-neutral-500 dark:border-neutral-800">
          <div className="mx-auto max-w-3xl">© {new Date().getFullYear()} Fantasy</div>
        </footer>
      </body>
    </html>
  );
}
