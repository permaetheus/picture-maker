import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from "@clerk/nextjs"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Portrait Generation Worker System",
  description: "Generate artistic portraits using Midjourney"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <header className="flex items-center justify-between border-b p-4">
            <h1 className="text-xl font-bold">Portrait Generator</h1>
            <div>
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  )
}
