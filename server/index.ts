import Fastify from 'fastify'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import config from './config.js'
import {
	RouterAppData,
	createConsumer,
	createProducer,
	createRouter,
	createTransport,
	createWorker,
	initMediasoup,
} from './mediasoup.js'
import { Server, Socket } from 'socket.io'
import { Router } from 'mediasoup/node/lib/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* ----------------------------- Global Variable ---------------------------- */
interface Room {
	id: string
	router: Router<RouterAppData>
	peers: string[]
}

interface Peer {
	id: string
	roomId: string
	socket: Socket
	// 存放对应peer的producer
	producers: string[]
}

// const MAX_SIZE_PER_ROOM = 10
const rooms = new Map<string, Room>()
const peers = new Map<string, Peer>()

/* -------------------------------- Mediasoup ------------------------------- */
initMediasoup()
const worker = await createWorker()

/* --------------------------------- Server --------------------------------- */
const { listenIp, listenPort, sslCrt, sslKey } = config
const server = Fastify({
	logger: true,
	// HTTPS 证书
	https: {
		cert: readFileSync(join(__dirname, sslCrt)),
		key: readFileSync(join(__dirname, sslKey)),
	},
})
server.get('/', () => 'TurboMeet')
await server.listen({ host: listenIp, port: listenPort })

/* -------------------------------- Websocket ------------------------------- */
const io = new Server(server.server, {
	cors: {
		origin: '*',
	},
})

io.on('connection', async socket => {
	await joinRoom(socket)
	console.log(rooms.keys(), peers.keys())

	socket.on('disconnect', async () => {
		await leaveRoom(socket)
	})
	socket.on('synchronizePeers', (data, callback) => {
		// 同步房间内其他用户信息
		const roomPeers = synchronizePeers(data.roomId)
		callback({ peers: roomPeers })
	})

	// 获取Router支持的RTP类型
	socket.on('routerRtpCapabilities', (_, callback) => {
		const router = worker.appData.routers.get(socket.data.routerId)!
		callback({ rtpCapabilities: router.rtpCapabilities })
	})

	// 与客户端连接Transport
	socket.on('transport', async (data, callback) => {
		const router = worker.appData.routers.get(socket.data.routerId)!
		switch (data.type) {
			case 'create':
				const transport = await createTransport(router)
				callback({
					id: transport.id,
					iceParameters: transport.iceParameters,
					iceCandidates: transport.iceCandidates,
					dtlsParameters: transport.dtlsParameters,
				})
				break
			case 'connect':
				const connTransport = router.appData.transports.get(data.transportId)!
				connTransport.connect({ dtlsParameters: data.dtlsParameters })
				callback()
				break
		}
	})

	// 客户端将媒体注入到mediasoup，即指示路由器接收音视频RTP
	socket.on('produce', async (data, callback) => {
		const transport = worker.appData.transports.get(data.transportId)!
		const producer = await createProducer(transport, data)
		callback({
			producerId: producer.id,
		})

		// 同步到peer上
		const peer = peers.get(socket.data.peerId)!
		peer.producers.push(producer.id)
		// 通知房间内的其他成员连接Producer
		socket
			.to(socket.data.roomId)
			.emit('newProducer', { peerId: socket.data.peerId, producerId: producer.id, kind: producer.kind })
	})

	// 从mediasoup提取媒体到客户端，即指示路由器发送音视频RTP
	socket.on('consume', async (data, callback) => {
		const router = worker.appData.routers.get(socket.data.routerId)!
		const transport = worker.appData.transports.get(data.transportId)!
		const producer = worker.appData.producers.get(data.producerId)!
		const consumer = await createConsumer(router, transport, producer, data)
		if (!consumer) {
			callback()
			return
		}
		callback({
			producerId: producer.id,
			id: consumer.id,
			kind: consumer.kind,
			type: consumer.type,
			rtpParameters: consumer.rtpParameters,
			producerPaused: consumer.producerPaused,
		})
	})

	// 播放video
	socket.on('resume', async (data, callback) => {
		const consumer = worker.appData.consumers.get(data.consumerId)!
		await consumer.resume()
		callback()
	})
})

/**
 * 加入房间
 */
const joinRoom = async (socket: Socket) => {
	const { peerId, roomId } = socket.handshake.query as {
		peerId: string
		roomId: string
	}
	if (!peerId || !roomId) {
		socket.emit('error', 'peerId or roomId can not be null')
		return
	}
	let peer = peers.get(peerId)
	// 用户已经存在
	if (peer) {
		socket.emit('error', 'peer has already been in the room')
		socket.disconnect(true)
		return
	}

	const room = await getOrCreateRoom(roomId)
	peer = {
		roomId,
		socket,
		id: peerId,
		producers: [],
	}
	peers.set(peerId, peer)
	room.peers.push(peerId)
	socket.join(roomId)
	socket.data.peerId = peerId
	socket.data.roomId = roomId
	socket.data.routerId = room.router.id

	socket.to(roomId).emit('userJoin', { peerId })
}

/**
 * 离开房间
 */
const leaveRoom = async (socket: Socket) => {
	const { peerId, roomId } = socket.data
	const room = rooms.get(roomId)!
	const peerIndex = room.peers.findIndex(val => val === peerId)

	room.peers.splice(peerIndex, 1)
	// 房间没有人时，删除该房间
	if (room.peers.length === 0) {
		rooms.delete(roomId)
	}
	peers.delete(peerId)

	socket.to(roomId).emit('userLeave', { peerId })
}

/**
 * 将peer与mediasoup建立Transport连接，包括Producer和Consumer
 */
const connectTransport = (router: Router<RouterAppData>) => {}

/**
 * 获取或创建房间
 */
const getOrCreateRoom = async (roomId: string) => {
	let room = rooms.get(roomId)
	if (!room) {
		const router = await createRouter(worker)
		room = {
			router,
			id: roomId,
			peers: [],
		}
		rooms.set(roomId, room)
	}

	return room
}

/**
 * 同步房间内其他用户的音视频
 */
const synchronizePeers = (roomId: string) => {
	const roomPeers = rooms.get(roomId)!.peers
	const data: {
		peerId: string
		producers: string[]
	}[] = []

	for (const peerId of roomPeers) {
		const peer = peers.get(peerId)!
		data.push({
			peerId: peer.id,
			producers: peer.producers,
		})
	}

	return data
}