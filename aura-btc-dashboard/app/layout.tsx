import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'AURA-BTC | Autonomous Bitcoin Intelligence',
  description: 'Air-gapped cyber-investigation and traffic correlation engine for offline Bitcoin intelligence.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-color-mode="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
