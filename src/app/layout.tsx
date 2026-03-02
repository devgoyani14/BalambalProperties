import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BalaOne Properties | AI-Powered Commercial Real Estate for HK SMEs",
  description:
    "Find the perfect commercial property in Hong Kong with AI-powered search, compliance pre-checks, and verified evidence packs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
