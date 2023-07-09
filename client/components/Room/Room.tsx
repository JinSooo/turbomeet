import useUserStore from '@/store/user'
import Chat from './Chat'
import Exhibition from './Exhibition/Exhibition'
import io, { Socket } from 'socket.io-client'
import * as mediasoup from 'mediasoup-client'
import { MediaType } from '@/types'
import { Consumer, Transport } from 'mediasoup-client/lib/types'
import { useEffect, useState } from 'react'
import Media from './Exhibition/RemoteMedia'
import LocalMedia from './Exhibition/LocalMedia'

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
	// 不包括自己
	const [memberCount, setMemberCount] = useState(0)

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
				await producerTransport.produce({ track: stream.getVideoTracks()[0] })
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
	const subscribe = async (peerId: string, producerId: string, kind: string) => {
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
			peer = { id: peerId, stream: new MediaStream(), producers: {}, videoId: `#remoteMedia-${count++}` }
			room.set(peerId, peer)
		}
		peer.producers![kind] = {
			producerId,
			consumer,
		}
		peer.stream.addTrack(consumer.track)
		// return stream
		;(document.querySelector(peer.videoId) as HTMLVideoElement).srcObject = peer.stream
		await socket.request('resume', { consumerId: consumer.id })

		console.log(room)
	}

	const initWebSocket = () => {
		socket = io('https://192.168.1.12:8080/', {
			query: {
				roomId,
				peerId: roomId + '-' + username,
			},
		})
		socket.on('connect', async () => {
			await loadDevice()
			await initTransport()
			await publish(mediaType)

			socket.on('newProducer', data => {
				if (!room.has(data.peerId)) {
					setMemberCount(memberCount => memberCount + 1)
				}
				subscribe(data.peerId, data.producerId, data.kind)
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
				{/* <Exhibition /> */}
				<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
					<LocalMedia id="localMedia" mediaType={mediaType} username={username} />
					{new Array(memberCount).fill(null).map((_, index) => (
						<Media id={`remoteMedia-${index}`} key={`remoteMedia-${index}`} username={'remote'} />
					))}
					{/* <Media /> */}
				</div>
			</div>
			<div className="w-72">
				<Chat />
			</div>
		</div>
	)
}

export default Room