import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { flags } from '@tradepilot/shared/env'
import { FlagsProvider } from '@/lib/flags-context'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'TradePilot',
  description: 'Multi-tenant B2B trade outreach SaaS for export businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = (
    <FlagsProvider value={flags}>
      <Providers>{children}</Providers>
    </FlagsProvider>
  )

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        {flags.isAuthEnabled ? (
          <ClerkProvider
            appearance={{ variables: { colorPrimary: 'hsl(231 48% 38%)', borderRadius: '0.625rem' } }}
          >
            {tree}
          </ClerkProvider>
        ) : (
          tree
        )}
      </body>
    </html>
  )
}
