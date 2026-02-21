import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ckpt",
  description: "The reasoning layer for every code change",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
