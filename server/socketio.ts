import http from 'http'
import https from 'https'
import http2 from 'http2'
import { Server } from 'socket.io'

export const initSocketIo = (server: http.Server | https.Server | http2.Http2SecureServer | number) => {
	const io = new Server(server, {
		// cors: true
	})

	return io
}
