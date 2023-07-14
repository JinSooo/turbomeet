/** @type {import('next').NextConfig} */
const runtimeCaching = require('next-pwa/cache')
const withPWA = require('next-pwa')({
	dest: 'public',
	runtimeCaching,
	disable: process.env.NODE_ENV === 'development',
})

const nextConfig = withPWA({
	reactStrictMode: true,
})

module.exports = nextConfig