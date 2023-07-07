import Fastify from 'fastify'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import config from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { listenIp, listenPort, sslCrt, sslKey } = config
const server = Fastify({
	logger: true,
	// HTTPS 证书
	https: {
		cert: readFileSync(join(__dirname, sslCrt)),
		key: readFileSync(join(__dirname, sslKey)),
	},
})
await server.listen({ host: listenIp, port: listenPort })
