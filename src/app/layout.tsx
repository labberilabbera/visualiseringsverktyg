import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Visualiseringsverktyg',
  description: 'AI-drivet visualiseringsverktyg för kreativa workshops',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
