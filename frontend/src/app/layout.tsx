import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// import { Header } from "@/components/header"
// import { Footer } from "@/components/footer"
// import { CartProvider } from "@/components/cart-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Apple Store",
  description: "Shop the latest Apple products including iPhone, iPad, and MacBook with free shipping and warranty.",
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* <CartProvider> */}
            {/* <Header /> */}
            <main>{children}</main>
            {/* <Footer /> */}
            <Toaster />
          {/* </CartProvider> */}
        </AuthProvider>
      </body>
    </html>
  )
}
