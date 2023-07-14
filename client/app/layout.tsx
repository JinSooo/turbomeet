import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'TurboMeet',
	description: 'TurboMeet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN">
			<head>
				{/* <meta
					name="viewport"
					content="width=device-width, initial-scale=1.0, user-scalable=no, minimum-sacle=1, maximum-scale=1"
				></meta> */}
				<meta
					name="viewport"
					content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
				/>
				<meta name="application-name" content="TurboMeet" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="TurboMeet" />
				<meta name="description" content="TurboMeet" />
				<meta name="format-detection" content="telephone=no" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="theme-color" content="#2C7A7B" />

				<link rel="apple-touch-icon" sizes="180x180" href="/icon/icon-192x192.png" />
				<link rel="manifest" href="/manifest.json" />
				<link rel="shortcut icon" href="/favicon.svg" />
			</head>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
