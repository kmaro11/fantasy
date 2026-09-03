import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import { TopBar } from "@/components/top-bar";
import { DraftProvider } from "@/lib/draft-store";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Draft Assist",
  description: "Eurolygos fantasy draft'o pagalbininkas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="lt" className={`${barlow.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full bg-base font-sans text-sm text-fg antialiased">
        <DraftProvider>
          <div className="flex h-full min-h-[640px] flex-col overflow-hidden">
            <TopBar />
            {children}
          </div>
        </DraftProvider>
      </body>
    </html>
  );
}
