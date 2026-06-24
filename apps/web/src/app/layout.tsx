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
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              // Reference our design tokens (CSS vars) instead of hardcoded HSLs so Clerk
              // follows the active theme everywhere: in-app UserButton/OrgSwitcher adapt to
              // light/dark, and on the forced-dark `(auth)` shell these vars resolve to the
              // dark values (so the card merges flush with bg-card, no jarring white box).
              variables: {
                colorPrimary: 'hsl(var(--primary))',
                colorBackground: 'hsl(var(--card))',
                colorInputBackground: 'hsl(var(--background))',
                colorInputText: 'hsl(var(--foreground))',
                colorText: 'hsl(var(--foreground))',
                colorTextSecondary: 'hsl(var(--muted-foreground))',
                colorTextOnPrimaryBackground: 'hsl(var(--primary-foreground))',
                colorNeutral: 'hsl(var(--foreground))',
                colorDanger: 'hsl(var(--destructive))',
                colorSuccess: 'hsl(var(--success))',
                colorWarning: 'hsl(var(--warning))',
                colorShimmer: 'hsl(var(--primary) / 0.1)',
                borderRadius: '0.625rem',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.875rem',
              },
              elements: {
                rootBox: 'w-full',
                // Let the card sit flush on our auth shell: no border/shadow, no double surface.
                cardBox: 'shadow-none',
                card: 'bg-transparent shadow-none border-0 p-0',
                headerTitle: 'text-foreground text-xl font-semibold tracking-tight',
                headerSubtitle: 'text-muted-foreground text-sm',
                socialButtonsBlockButton:
                  'border border-input bg-background hover:bg-muted transition-colors',
                socialButtonsBlockButtonText: 'font-medium',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground text-xs',
                formFieldLabel: 'text-foreground text-sm font-medium',
                formFieldInput:
                  'bg-background border border-input rounded-md focus:ring-2 focus:ring-ring',
                formButtonPrimary:
                  'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium normal-case',
                footerActionText: 'text-muted-foreground text-sm',
                footerActionLink: 'text-primary hover:text-primary/90 font-medium',
                identityPreviewEditButton: 'text-primary',
                formResendCodeLink: 'text-primary',
                otpCodeFieldInput: 'bg-background border border-input',
              },
            }}
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
