import useUserStore from '@/store/user'
import Chat from './Chat'
import Exhibition from './Exhibition/Exhibition'
import io, { Socket } from 'socket.io-client'
import * as mediasoup from 'mediasoup-client'
import { MediaType } from '@/types'
import { Consumer, Transport } from 'mediasoup-client/lib/types'
import { useEffect, useState } from 'react'
import { useToast } from '@chakra-ui/react'

interface PeerInfo {
	id: string
	stream: MediaStream
	producers?: {
		[key: string]: {
			producerId: string
			consumer: Consumer
		}
	}
	videoId: string
}

let socket: Socket
let device: mediasoup.Device
let producerTransport: Transport
let consumerTransport: Transport
let count = 0
// 成员列表
const room = new Map<string, PeerInfo>()

const Room = () => {
	const [roomId, username, mediaType] = useUserStore(state => [state.roomId, state.username, state.mediaType])
	const peerId = roomId + '-' + username
	const toast = useToast({ position: 'bottom-right' })
	// 所有远程Peer的ID，用于渲染Media音视频
	const [peersMedia, setPeersMedia] = useState<string[]>([])

	// 获取并加载device支持RTP类型
	const loadDevice = async () => {
		// 获取Router支持的RTP功能
		const data = await socket.request('routerRtpCapabilities')
		device = new mediasoup.Device()
		await device.load({ routerRtpCapabilities: data.rtpCapabilities })
	}
	// 创建Producer Transport
	const createProducerTransport = async () => {
		const data = await socket.request('transport', {
			type: 'create',
		})
		// 创建一个新的WebRtc Transport来发送媒体。传输必须事先通过router.createWebRtcTransport()在mediasoup路由器中创建
		const transport = device.createSendTransport(data)
		// 建立ICE DTLS连接，并需要与相关的服务器端传输交换信息
		transport.on('connect', ({ dtlsParameters }, callback, errCallback) => {
			socket
				.request('transport', { dtlsParameters, type: 'connect', transportId: transport.id })
				.then(callback)
				.catch(errCallback)
		})
		// 当传输需要将有关新生产者的信息传输到关联的服务器端传输时发出。该事件发生在 Produce() 方法完成之前
		transport.on('produce', async ({ kind, rtpParameters }, callback, errCallback) => {
			socket
				.request('produce', { kind, rtpParameters, transportId: transport.id })
				.then(id => callback({ id }))
				.catch(errCallback)
		})
		transport.on('connectionstatechange', state => {
			switch (state) {
				case 'connecting':
					console.log('Producer publishing...')
					break
				case 'connected':
					console.log('Producer published')
					break
				case 'failed':
					console.log('Producer failed')
					transport.close()
					break
			}
		})

		return transport
	}
	// 创建Consumer Transport
	const createConsumerTransport = async () => {
		const data = await socket.request('transport', {
			type: 'create',
		})
		// 创建一个新的WebRTC Transport来接收媒体。传输必须事先通过router.createWebRtcTransport()在mediasoup路由器中创建
		const transport = device.createRecvTransport(data)
		transport.on('connect', ({ dtlsParameters }, callback, errCallback) => {
			socket
				.request('transport', { dtlsParameters, type: 'connect', transportId: transport.id })
				.then(callback)
				.catch(errCallback)
		})
		transport.on('connectionstatechange', async state => {
			switch (state) {
				case 'connecting':
					console.log('Consumer subscribing...')
					break
				case 'connected':
					console.log('Consumer subscribed')
					// await socket.request('resume', {
					// 	consumerId,
					// 	transportId: consumerTransport.id,
					// })
					break
				case 'failed':
					console.log('Consumer failed')
					transport.close()
					break
			}
		})

		return transport
	}
	const initTransport = async () => {
		producerTransport = await createProducerTransport()
		consumerTransport = await createConsumerTransport()
	}
	// 向mediasoup服务器传输流媒体
	const publish = async (type: MediaType) => {
		if (type === MediaType.FORBID) return

		let constraint = undefined
		switch (type) {
			case MediaType.AUDIO:
				constraint = {
					audio: {
						echoCancellation: true, // 开启回音消除
						noiseSuppression: true, // 降噪
						autoGainControl: true, // 自动增益
					},
				}
				break
			case MediaType.VIDEO:
				constraint = { video: { aspectRatio: 16 / 9 } }
				break
			case MediaType.ALL:
				constraint = {
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true,
					},
					video: { aspectRatio: 16 / 9 },
				}
				break
		}
		const stream = await navigator.mediaDevices.getUserMedia(constraint)
		switch (type) {
			case MediaType.AUDIO:
				await producerTransport.produce({ track: stream.getAudioTracks()[0] })
				break
			case MediaType.VIDEO:
				const producer = await producerTransport.produce({ track: stream.getVideoTracks()[0] })
				console.log(producer)
				break
			case MediaType.ALL:
				await producerTransport.produce({ track: stream.getAudioTracks()[0] })
				await producerTransport.produce({ track: stream.getVideoTracks()[0] })
				break
		}
		// return stream
		;(document.querySelector('#localMedia') as HTMLVideoElement).srcObject = stream
	}
	// 从mediasoup服务器订阅获取流媒体
	const subscribe = async (peerId: string, producerId: string) => {
		const data = await socket.request('consume', {
			producerId,
			transportId: consumerTransport.id,
			rtpCapabilities: device.rtpCapabilities,
		})
		const consumer = await consumerTransport.consume({
			id: data.id,
			producerId: data.producerId,
			kind: data.kind,
			rtpParameters: data.rtpParameters,
		})
		let peer = room.get(peerId)
		if (!peer) {
			peer = { id: peerId, stream: new MediaStream(), producers: {}, videoId: `#remoteMedia-${peerId}` }
			room.set(peerId, peer)
		}
		peer.producers![data.kind] = {
			producerId,
			consumer,
		}
		peer.stream.addTrack(consumer.track)
		// return stream
		;(document.querySelector(peer.videoId) as HTMLVideoElement).srcObject = peer.stream
		await socket.request('resume', { consumerId: consumer.id })
	}
	// 同步房间内其他用户的音视频
	const synchronizePeers = async () => {
		let { peers } = await socket.request('synchronizePeers', { roomId })
		// @ts-ignore
		peers = peers.filter(peer => peer.peerId !== peerId)
		// @ts-ignore
		setPeersMedia(peers.map(peer => peer.peerId))
		for (const peer of peers) {
			for (const producerId of peer.producers) {
				subscribe(peer.peerId, producerId)
			}
		}
	}

	const initWebSocket = () => {
		socket = io('https://192.168.1.12:8080/', {
			query: {
				roomId,
				peerId,
			},
		})
		socket.on('connect', async () => {
			await loadDevice()
			await initTransport()
			await publish(mediaType)
			await synchronizePeers()

			socket.on('disconnection', reason => {
				if (reason === 'io server disconnect') {
					// 断线是由服务器发起的，重新连接。
					socket.connect()
				} else {
					toast({ status: 'error', description: 'You are disconnected' })
				}
			})
			socket.on('error', async data => {
				toast({ status: 'error', description: `Error: ${data}` })
			})
			socket.on('userJoin', async data => {
				toast({ status: 'info', description: `User ${data.peerId.split('-')[1]} join the room` })
			})
			socket.on('userLeave', async data => {
				toast({ status: 'warning', description: `User ${data.peerId.split('-')[1]} leave the room` })
				// 离开则删除用户，移除Media
				setPeersMedia(peersMedia => peersMedia.filter(peerId => peerId !== data.peerId))
			})
			// 有新的用户进入，读取它的音视频数据
			socket.on('newProducer', data => {
				if (!room.has(data.peerId)) {
					// 添加用户，增添一个新的Media
					setPeersMedia(peersMedia => [...peersMedia, data.peerId])
				}
				subscribe(data.peerId, data.producerId)
			})
		})

		// 直接加到socket源码里
		// request<T = any>(ev: Ev, ...args: EventParams<EmitEvents, Ev>): Promise<T>
		socket.request = (ev, data) => {
			return new Promise(resolve => {
				socket.emit(ev, data, resolve)
			})
		}
	}

	useEffect(() => {
		initWebSocket()
	}, [])

	return (
		<div className="flex w-full h-full bg-[url('/img/background.jpg')] bg-cover bg-no-repeat bg-center bg-fixed">
			<div className="flex-1">
				<Exhibition username={username} mediaType={mediaType} peersMedia={peersMedia} />
			</div>
			<div className="w-72">
				<Chat />
			</div>
		</div>
	)
}

export default Room
