import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import Script from 'next/script'
config.autoAddCss = false // Mencegah Font Awesome menambahkan CSS secara otomatis

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary',
})

const parseBooleanEnv = (value: string | undefined) => value?.trim().toLowerCase() === "true";
const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() || "";
const explicitMidtransMode = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION;
const inferredMidtransProduction = midtransClientKey ? !midtransClientKey.startsWith("SB-") : false;
const isMidtransProduction =
  typeof explicitMidtransMode === "string" && explicitMidtransMode.trim() !== ""
    ? parseBooleanEnv(explicitMidtransMode)
    : inferredMidtransProduction;
const midtransSnapSrc = isMidtransProduction
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

export const metadata: Metadata = {
  title: {
    default: "Papin Dashboard",
    template: "%s | Papin Dashboard",
  },
  description:
    "Papin Dashboard adalah platform manajemen dan monitoring data aplikasi Papin secara real-time, cepat, dan aman.",

  applicationName: "Papin Dashboard",

  keywords: [
    "Papin",
    "Dashboard Papin",
    "User Panel",
    "Monitoring",
    "Manajemen Data",
    "Papin App",
  ],

  authors: [{ name: "Papin Team" }],

  creator: "Papin",
  publisher: "Papin",

  metadataBase: new URL("https://app.papin.com"),

  openGraph: {
    title: "Papin Dashboard",
    description:
      "Kelola dan pantau semua aktivitas aplikasi Papin melalui dashboard modern dan responsif.",
    url: "https://app.papin.com/dashboard",
    siteName: "Papin Dashboard",
    images: [
      {
        url: "https://app.papin.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Papin Dashboard Preview",
      },
    ],
    locale: "id_ID",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Papin Dashboard",
    description:
      "Dashboard resmi Papin untuk monitoring dan manajemen aplikasi secara efisien.",
    images: ["https://app.papin.com/og-image.png"],
  },

  robots: {
    index: false, // dashboard biasanya tidak perlu diindex Google
    follow: false,
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${poppins.variable} antialiased`}
      >
        {children}
        <Script 
          src={midtransSnapSrc}
          data-client-key={midtransClientKey || undefined}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
