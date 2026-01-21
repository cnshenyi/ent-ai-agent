import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "许庚医生 - 耳鼻喉AI助手",
  description: "专业的耳鼻喉科AI智能助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
