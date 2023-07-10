import useUserStore from '@/store/user'
import Chat from './Chat'
import Exhibition from './Exhibition/Exhibition'
import io, { Socket } from 'socket.io-client'
import * as mediasoup from 'mediasoup-client'
import { MediaType } from '@/types'
import { Consumer, Producer, Transport } from 'mediasoup-client/lib/types'
import { useEffect, useState } from 'react'
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
// 成员流媒体列表
const room = new Map<string, PeerInfo>()
const producers = new Map<string, Producer>()
const consumers = new Map<string, Consumer>()

const Room = () => {
	const [roomId, mediaType] = useUserStore(state => [state.roomId, state.mediaType])
	const [me, peers, setMeProducers, addPeer, removePeer, addPeerConsumer, addProducer, addConsumer] = useMediasoupStore(
		state => [
			state.me,
			state.peers,
			state.setMeProducers,
			state.addPeer,
			state.removePeer,
			state.addPeerConsumer,
			state.addProducer,
			state.addConsumer,
		],
	)
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
	// 向mediasoup服务器传输流媒体
	const publish = async (type: MediaType) => {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
			video: { aspectRatio: 16 / 9 },
		})
		const audioProducer = await producerTransport.produce({ track: stream.getAudioTracks()[0] })
		const videoProducer = await producerTransport.produce({ track: stream.getVideoTracks()[0] })

		setMeProducers({ audio: audioProducer.id, video: videoProducer.id })
		addProducer({
			[audioProducer.id]: {
				id: audioProducer.id,
				track: audioProducer.track,
				paused: audioProducer.paused,
			},
			[videoProducer.id]: {
				id: videoProducer.id,
				track: videoProducer.track,
				paused: videoProducer.paused,
			},
		})
		producers.set(audioProducer.id, audioProducer)
		producers.set(videoProducer.id, videoProducer)

		// 根据配置关闭对应的流
		switch (type) {
			case MediaType.FORBID:
				controlProducer('pause', audioProducer.id)
				controlProducer('pause', videoProducer.id)
				break
			case MediaType.AUDIO:
				controlProducer('pause', videoProducer.id)
				break
			case MediaType.VIDEO:
				controlProducer('pause', audioProducer.id)
				break
			case MediaType.ALL:
				break
		}

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
		/**
		 * TODO: 每次都添加一次Peer的方式不行，但目前无法获取到准确的peers，所以只能先在addPeer中处理逻辑了
		 */
		// 添加Peer，如果存在则忽略
		addPeer(peerId)
		addPeerConsumer(peerId, consumer.id)
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
			for (const producerId of peer.producers) {
				subscribe(peer.peerId, producerId)
			}
		}
	}
	// 控制Producer流媒体的开关
	const controlProducer = async (type: 'pause' | 'resume', producerId: string) => {
		const producer = producers.get(producerId)!

		switch (type) {
			case 'pause':
				await socket.request('producerPause', producer.id)
				producer.pause()
				break
			case 'resume':
				await socket.request('producerResume', producer.id)
				producer.resume()
				break
		}
	}

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
				removePeer(data.peerId)
				// const peer = room.get(data.peerId)!
				// !peer.producers!.audio?.consumer?.closed && peer.producers!.audio?.consumer?.close()
				// !peer.producers!.video?.consumer?.closed && peer.producers!.video?.consumer?.close()
				// room.delete(data.peerId)
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
				<Exhibition mediaType={mediaType} me={me} peers={peers} controlProducer={controlProducer} />
			</div>
			<div className="w-72">
				<Chat />
			</div>
		</div>
	)
}

export default Room
