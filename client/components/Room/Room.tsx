import useUserStore from '@/store/user'
import Chat from './Chat'
import Exhibition from './Exhibition/Exhibition'
import io, { Socket } from 'socket.io-client'
import * as mediasoup from 'mediasoup-client'
import { MediaType, SelfMediaType } from '@/types'
import { Consumer, Producer, Transport } from 'mediasoup-client/lib/types'
import { useEffect } from 'react'
import { useToast } from '@chakra-ui/react'
import useMediasoupStore from '@/store/mediasoup'

export interface PeerInfo {
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

export interface SelfInfo {
	id: string
	stream?: MediaStream
	producers?: {
		[key: string]: Producer
	}
}

let socket: Socket
let device: mediasoup.Device
let producerTransport: Transport
let consumerTransport: Transport
// 实例映射
const producers = new Map<string, Producer>()
const consumers = new Map<string, Consumer>()

const Room = () => {
	const [roomId, mediaType] = useUserStore(state => [state.roomId, state.mediaType])
	const [
		me,
		peers,
		addMeProducer,
		removeMeProducer,
		addPeer,
		removePeer,
		addPeerConsumer,
		addProducer,
		removeProducer,
		addConsumer,
	] = useMediasoupStore(state => [
		state.me,
		state.peers,
		state.addMeProducer,
		state.removeMeProducer,
		state.addPeer,
		state.removePeer,
		state.addPeerConsumer,
		state.addProducer,
		state.removeProducer,
		state.addConsumer,
	])
	const toast = useToast({ position: 'bottom-right' })

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
	// 保存Producer信息到全局上
	const savePublishMedia = (type: SelfMediaType, producer: Producer) => {
		addMeProducer(type, producer.id.producerId)
		addProducer({
			[producer.id.producerId]: {
				id: producer.id.producerId,
				track: producer.track,
				paused: producer.paused,
			},
		})
		producers.set(producer.id.producerId, producer)
	}
	// 向服务器推音频流
	const publishAudio = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
			video: false,
		})
		const audioProducer = await producerTransport.produce({ track: stream.getAudioTracks()[0] })
		savePublishMedia('audio', audioProducer)
	}
	// 向服务器推视频流
	const publishVideo = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: { aspectRatio: 16 / 9 },
		})
		const videoProducer = await producerTransport.produce({ track: stream.getVideoTracks()[0] })
		savePublishMedia('video', videoProducer)
	}
	// 向服务器推共享屏幕
	const publishShare = async () => {
		const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
		const shareProducer = await producerTransport.produce({ track: stream.getVideoTracks()[0] })
		savePublishMedia('share', shareProducer)
	}
	// 关闭推流
	const closeMedia = (type: SelfMediaType, producerId: string) => {
		const producer = producers.get(producerId)!
		producer.close()

		removeMeProducer(type)
		removeProducer(producerId)
		producers.delete(producerId)
	}
	// 初始设置推流
	const publish = async (type: MediaType) => {
		// 根据配置推对应的流
		switch (type) {
			case MediaType.FORBID:
				break
			case MediaType.AUDIO:
				publishAudio()
				break
			case MediaType.VIDEO:
				publishVideo()
				break
			case MediaType.ALL:
				publishAudio()
				publishVideo()
				break
		}
	}
	// 从mediasoup服务器订阅流媒体
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
		/**
		 * TODO: 每次都添加一次Peer的方式不行，但目前无法获取到准确的peers，所以只能先在addPeer中处理逻辑了
		 */
		// 添加Peer，如果存在则忽略
		// addPeer(peerId)
		addPeerConsumer(peerId, consumer.id, data.kind)
		addConsumer({
			[consumer.id]: {
				id: consumer.id,
				kind: consumer.kind,
				pausedLocally: false,
				pausedRemotely: consumer.paused,
				track: consumer.track,
			},
		})
		consumers.set(consumer.id, consumer)

		// 客户端接收到consumer之后，就可以通知服务器恢复了
		await socket.request('resume', { consumerId: consumer.id })
	}
	// 同步房间内其他用户的音视频
	const synchronizePeers = async () => {
		let { peers } = await socket.request('synchronizePeers', { roomId })
		// @ts-ignore
		peers = peers.filter(peer => peer.peerId !== me.id)
		for (const peer of peers) {
			addPeer(peer.peerId)
			for (const producerId of peer.producers) {
				subscribe(peer.peerId, producerId)
			}
		}
	}
	// 关闭与Peer对应的Consumer
	const leavePeer = async (peerId: string) => {
		const peer = peers[peerId]
		for (const consumerId of Object.values(peer.consumers)) {
			await socket.request('consumerClose', { consumerId })
			const consumer = consumers.get(consumerId)!
			consumer.close()
		}
	}
	// 初始化WebSocket
	const initWebSocket = () => {
		socket = io('https://192.168.1.12:8080/', {
			query: {
				roomId,
				peerId: me.id,
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
					producerTransport.close()
					consumerTransport.close()
				}
			})
			socket.on('error', async data => {
				toast({ status: 'error', description: `Error: ${data}` })
			})
			socket.on('userJoin', async data => {
				toast({ status: 'info', description: `User ${data.peerId.split('-')[1]} join the room` })
				addPeer(data.peerId)
			})
			socket.on('userLeave', async data => {
				toast({ status: 'warning', description: `User ${data.peerId.split('-')[1]} leave the room` })
				// 离开则删除用户，移除Media
				leavePeer(data.peerId)
				removePeer(data.peerId)
			})
			// 有新的用户进入，读取它的音视频数据
			socket.on('newProducer', data => {
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
				<Exhibition
					mediaType={mediaType}
					me={me}
					peers={peers}
					publishAudio={publishAudio}
					publishVideo={publishVideo}
					publishShare={publishShare}
					closeMedia={closeMedia}
				/>
			</div>
			<div className="w-72">
				<Chat />
			</div>
		</div>
	)
}

export default Room
