import { skipWaiting, clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { NetworkOnly, NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { registerRoute, setDefaultHandler, setCatchHandler } from 'workbox-routing'
import { matchPrecache, precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

skipWaiting()
clientsClaim()

// must include following lines when using inject manifest module from workbox
// https://developers.google.com/web/tools/workbox/guides/precache-files/workbox-build#add_an_injection_point
const WB_MANIFEST = self.__WB_MANIFEST
// Precache fallback route and image
WB_MANIFEST.push({
	url: '/offline', //这里是重点，主要方式断网后呈现的自定义页面（page/offline.js）
	revision: '1234567890',
})

precacheAndRoute(self.__precacheManifest)

// HTML 请求: 网络优先
registerRoute(/index.html/, NetworkFirst({ cacheName: 'workbox:html' }))

// JS 请求: 网络优先
registerRoute(/.*\.js/, NetworkFirst({ cacheName: 'workbox:js' }))

// CSS 请求: 缓存优先，同时后台更新后下次打开页面才会被页面使用
registerRoute(/.*\.css/, StaleWhileRevalidate({ cacheName: 'workbox:css' }))

// 图片请求: 缓存优先
registerRoute(
	/.*.(?:png|jpg|jpeg|svg|gif)/,
	CacheFirst({
		cacheName: 'workbox:img',
		plugins: [
			new ExpirationPlugin({
				// Cache only 20 images
				maxEntries: 20,
				// Cache for a maximum of a week
				maxAgeSeconds: 7 * 24 * 60 * 60,
				// Automatically cleanup if quota is exceeded.
				purgeOnQuotaError: true,
			}),
		],
	}),
)
