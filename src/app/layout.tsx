import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: { default: "ACSL Practice", template: "%s · ACSL Practice" },
  description: "ACSL-style programming problems with code execution and automatic grading.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <Script id="theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('acsl-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`}
        </Script>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
