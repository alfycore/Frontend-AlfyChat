import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Krona_One, Raleway } from "next/font/google";

import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { BackgroundProvider } from "@/components/background-provider";
import { PrefetchDMs } from "@/components/prefetch-dms";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const ralewayHeading = Raleway({subsets:['latin'],variable:'--font-heading'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kronaOne = Krona_One({
  variable: "--font-krona",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlfyChat",
  description: "Messagerie sécurisée française — chiffrement de bout en bout",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AlfyChat",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={cn(geistSans.variable, geistMono.variable, kronaOne.variable, ralewayHeading.variable)}>
      <head>
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/4.0.0/uicons-bold-rounded/css/uicons-bold-rounded.css" />
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/4.0.0/uicons-brands/css/uicons-brands.css" />
      </head>
      <body
        className="bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <PrefetchDMs />
              <BackgroundProvider>
                {children}
              </BackgroundProvider>
            </AuthProvider>
          </LocaleProvider>
        <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
