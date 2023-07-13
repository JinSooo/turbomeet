import * as mediasoup from 'mediasoup'
import {
	AppData,
	Consumer,
	Producer,
	Router,
	RtpCodecCapability,
	Transport,
	TransportListenIp,
	Worker,
	WorkerLogLevel,
	WorkerLogTag,
} from 'mediasoup/node/lib/types.js'
import config from './config.js'

export interface WorkerAppData extends AppData {
	routers: Map<string, Router<RouterAppData>>
	transports: Map<string, Transport<TransportAppData>>
	producers: Map<string, Producer<ProducerAppData>>
	consumers: Map<string, Consumer<ConsumerAppData>>
}

export interface RouterAppData extends AppData {
	worker: Worker
	transports: Map<string, Transport<TransportAppData>>
	producers: Map<string, Producer<ProducerAppData>>
	consumers: Map<string, Consumer<ConsumerAppData>>
}

export interface TransportAppData extends AppData {
	router: Router
	producers: Map<string, Producer<ProducerAppData>>
	consumers: Map<string, Consumer<ConsumerAppData>>
}

export interface ProducerAppData extends AppData {
	transport: Transport
}

export interface ConsumerAppData extends AppData {
	transport: Transport
}

export const initMediasoup = async () => {
	// @ts-ignore
	mediasoup.observer.on('newworker', (worker: Worker<WorkerAppData>) => {
		worker.appData.routers = new Map()
		worker.appData.transports = new Map()
		worker.appData.producers = new Map()
		worker.appData.consumers = new Map()

		// @ts-ignore
		worker.observer.on('newrouter', (router: Router<RouterAppData>) => {
			router.appData.worker = worker
			router.appData.transports = new Map()
			router.appData.producers = new Map()
			router.appData.consumers = new Map()
			worker.appData.routers.set(router.id, router)

			router.observer.on('close', () => {
				worker.appData.routers.delete(router.id)
			})
			// @ts-ignore
			router.observer.on('newtransport', (transport: Transport<TransportAppData>) => {
				transport.appData.router = router
				transport.appData.producers = new Map()
				transport.appData.consumers = new Map()
				router.appData.transports.set(transport.id, transport)
				worker.appData.transports.set(transport.id, transport)

				transport.observer.on('close', () => {
					router.appData.transports.delete(transport.id)
					worker.appData.transports.delete(transport.id)
				})
				// @ts-ignore
				transport.observer.on('newproducer', (producer: Producer<ProducerAppData>) => {
					producer.appData.transport = transport
					transport.appData.producers.set(producer.id, producer)
					router.appData.producers.set(producer.id, producer)
					worker.appData.producers.set(producer.id, producer)

					producer.observer.on('close', () => {
						transport.appData.producers.delete(producer.id)
						router.appData.producers.delete(producer.id)
						worker.appData.producers.delete(producer.id)
					})
				})
				// @ts-ignore
				transport.observer.on('newconsumer', (consumer: Consumer<ConsumerAppData>) => {
					console.log('new consumer', consumer.id)
					consumer.appData.transport = transport
					transport.appData.consumers.set(consumer.id, consumer)
					router.appData.consumers.set(consumer.id, consumer)
					worker.appData.consumers.set(consumer.id, consumer)

					consumer.observer.on('close', () => {
						transport.appData.consumers.delete(consumer.id)
						router.appData.consumers.delete(consumer.id)
						worker.appData.consumers.delete(consumer.id)
					})
				})
			})
		})
	})
}

export const createWorker = async () => {
	const { logLevel, logTags, rtcMinPort, rtcMaxPort } = config.mediasoup.worker

	const worker = await mediasoup.createWorker<WorkerAppData>({
		rtcMinPort,
		rtcMaxPort,
		logLevel: logLevel as WorkerLogLevel,
		logTags: logTags as WorkerLogTag[],
	})

	return worker
}

export const createRouter = async (worker: Worker<WorkerAppData>) => {
	const { mediaCodecs } = config.mediasoup.router

	const router = await worker.createRouter<RouterAppData>({
		mediaCodecs: mediaCodecs as RtpCodecCapability[],
	})

	return router
}

export const createTransport = async (router: Router<RouterAppData>) => {
	const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } = config.mediasoup.webRtcTransport

	const transport = await router.createWebRtcTransport<TransportAppData>({
		initialAvailableOutgoingBitrate,
		listenIps: listenIps as TransportListenIp[],
		enableUdp: true,
		enableTcp: true,
		preferUdp: true,
	})
	if (maxIncomingBitrate) {
		await transport.setMaxIncomingBitrate(maxIncomingBitrate)
	}

	return transport
}

export const createProducer = async (transport: Transport<TransportAppData>, data: any) => {
	const producer = await transport.produce<ProducerAppData>({ kind: data.kind, rtpParameters: data.rtpParameters })

	return producer
}

export const createProducerData = async (transport: Transport<TransportAppData>, data: any) => {
	const producerData = await transport.produceData<ProducerAppData>({
		label: data.label,
		protocol: data.protocol,
		sctpStreamParameters: data.sctpStreamParameters,
	})

	return producerData
}

export const createConsumer = async (
	router: Router<RouterAppData>,
	transport: Transport<TransportAppData>,
	producer: Producer<ProducerAppData>,
	data: any,
) => {
	if (!router.canConsume({ producerId: producer.id, rtpCapabilities: data.rtpCapabilities })) return

	const consumer = await transport.consume<ConsumerAppData>({
		producerId: producer.id,
		rtpCapabilities: data.rtpCapabilities,
		paused: producer.kind === 'video',
	})
	if (consumer.type === 'simulcast') {
		await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 })
	}

	return consumer
}

export const createConsumerData = async (transport: Transport<TransportAppData>, dataProducerId: string) => {
	const consumerData = await transport.consumeData<ConsumerAppData>({
		dataProducerId: dataProducerId,
	})

	return consumerData
}