import * as mediasoup from 'mediasoup';
import config from './config.js';
export const initMediasoup = async () => {
    // @ts-ignore
    mediasoup.observer.on('newworker', (worker) => {
        worker.appData.routers = new Map();
        worker.appData.transports = new Map();
        worker.appData.producers = new Map();
        worker.appData.consumers = new Map();
        // @ts-ignore
        worker.observer.on('newrouter', (router) => {
            router.appData.worker = worker;
            router.appData.transports = new Map();
            router.appData.producers = new Map();
            router.appData.consumers = new Map();
            worker.appData.routers.set(router.id, router);
            router.observer.on('close', () => {
                worker.appData.routers.delete(router.id);
            });
            // @ts-ignore
            router.observer.on('newtransport', (transport) => {
                transport.appData.router = router;
                transport.appData.producers = new Map();
                transport.appData.consumers = new Map();
                router.appData.transports.set(transport.id, transport);
                worker.appData.transports.set(transport.id, transport);
                transport.observer.on('close', () => {
                    router.appData.transports.delete(transport.id);
                    worker.appData.transports.delete(transport.id);
                });
                // @ts-ignore
                transport.observer.on('newproducer', (producer) => {
                    producer.appData.transport = transport;
                    transport.appData.producers.set(producer.id, producer);
                    router.appData.producers.set(producer.id, producer);
                    worker.appData.producers.set(producer.id, producer);
                    producer.observer.on('close', () => {
                        transport.appData.producers.delete(producer.id);
                        router.appData.producers.delete(producer.id);
                        worker.appData.producers.delete(producer.id);
                    });
                });
                // @ts-ignore
                transport.observer.on('newconsumer', (consumer) => {
                    console.log('new consumer', consumer.id);
                    consumer.appData.transport = transport;
                    transport.appData.consumers.set(consumer.id, consumer);
                    router.appData.consumers.set(consumer.id, consumer);
                    worker.appData.consumers.set(consumer.id, consumer);
                    consumer.observer.on('close', () => {
                        console.log('close consumer', consumer.id);
                        transport.appData.consumers.delete(consumer.id);
                        router.appData.consumers.delete(consumer.id);
                        worker.appData.consumers.delete(consumer.id);
                    });
                });
            });
        });
    });
};
export const createWorker = async () => {
    const { logLevel, logTags, rtcMinPort, rtcMaxPort } = config.mediasoup.worker;
    const worker = await mediasoup.createWorker({
        rtcMinPort,
        rtcMaxPort,
        logLevel: logLevel,
        logTags: logTags,
    });
    return worker;
};
export const createRouter = async (worker) => {
    const { mediaCodecs } = config.mediasoup.router;
    const router = await worker.createRouter({
        mediaCodecs: mediaCodecs,
    });
    return router;
};
export const createTransport = async (router) => {
    const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } = config.mediasoup.webRtcTransport;
    const transport = await router.createWebRtcTransport({
        initialAvailableOutgoingBitrate,
        listenIps: listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
    if (maxIncomingBitrate) {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
    }
    return transport;
};
export const createProducer = async (transport, data) => {
    const producer = await transport.produce({ kind: data.kind, rtpParameters: data.rtpParameters });
    return producer;
};
export const createProducerData = async (transport, data) => {
    const producerData = await transport.produceData({
        label: data.label,
        protocol: data.protocol,
        sctpStreamParameters: data.sctpStreamParameters,
    });
    return producerData;
};
export const createConsumer = async (router, transport, producer, data) => {
    if (!router.canConsume({ producerId: producer.id, rtpCapabilities: data.rtpCapabilities }))
        return;
    const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: data.rtpCapabilities,
        paused: producer.kind === 'video',
    });
    if (consumer.type === 'simulcast') {
        await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
    }
    return consumer;
};
export const createConsumerData = async (transport, dataProducerId) => {
    const consumerData = await transport.consumeData({
        dataProducerId: dataProducerId,
    });
    return consumerData;
};
