import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "AI Code Review",
  description: "AI-Powered Code Review System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-poppins">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
