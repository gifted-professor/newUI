import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "海外网红邮件解析",
  description: "把海外网红回信，直接变成可报价表。自动提取报价、底线与合作意向，5 分钟同步到飞书。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${interTight.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
