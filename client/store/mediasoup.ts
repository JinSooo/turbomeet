import { create } from 'zustand'
import { Me, Peer, PeerConsumer, SelfProducer } from '@/types'

interface State {
	me: Me
	peers: {
		[key: string]: Peer
	}
	producers: {
		[key: string]: SelfProducer
	}
	consumers: {
		[key: string]: PeerConsumer
	}
}

interface Action {
	setMeId: (id: Me['id']) => void
	setMeAudioId: (audioId: Me['audioId']) => void
	setMeVideoId: (videoId: Me['videoId']) => void
	setMeUsername: (username: Me['username']) => void
	setMeProducers: (producers: Me['producers']) => void
	addMeProducer: (producerName: string, producerId: string) => void
	removeMeProducer: (producerName: string) => void
	setPeers: (peers: State['peers']) => void
	addPeer: (peerId: string) => void
	removePeer: (peerId: string) => void
	addPeerConsumer: (peerId: string, consumerId: string, consumerKind: string) => void
	removePeerConsumer: (peerId: string, consumerId: string) => void
	setProducers: (producers: State['producers']) => void
	addProducer: (producer: State['producers']) => void
	removeProducer: (producerId: string) => void
	setConsumers: (consumers: State['consumers']) => void
	addConsumer: (producer: State['consumers']) => void
	removeConsumer: (consumerId: string) => void
	reset: () => void
}

const initialState = {
	me: {
		id: '',
		username: '',
		producers: {
			audio: '',
			video: '',
		},
		audioId: '',
		videoId: '',
	},
	peers: {},
	producers: {},
	consumers: {},
}

const useMediasoupStore = create<State & Action>(set => ({
	...initialState,

	setMeId: id => set(state => ({ me: { ...state.me, id } })),
	setMeAudioId: audioId => set(state => ({ me: { ...state.me, audioId } })),
	setMeVideoId: videoId => set(state => ({ me: { ...state.me, videoId } })),
	setMeUsername: username => set(state => ({ me: { ...state.me, username } })),
	setMeProducers: producers => set(state => ({ me: { ...state.me, producers: producers } })),
	addMeProducer: (producerName, producerId) =>
		set(state => {
			state.me.producers[producerName] = producerId
			return { me: { ...state.me } }
		}),
	removeMeProducer: producerName =>
		set(state => {
			delete state.me.producers[producerName]
			return { me: { ...state.me } }
		}),
	setPeers: peers => set(state => ({ peers: peers })),
	addPeer: peerId =>
		set(state => {
			if (!state.peers[peerId]) {
				state.peers[peerId] = {
					id: peerId,
					username: peerId.split('-')[1],
					consumers: {},
				}
			}

			return { peers: { ...state.peers } }
		}),
	removePeer: peerId =>
		set(state => {
			delete state.peers[peerId]
			return { peers: { ...state.peers } }
		}),
	addPeerConsumer: (peerId, consumerId, consumerKind) =>
		set(state => {
			state.peers[peerId].consumers[consumerKind] = consumerId
			return { peers: { ...state.peers } }
		}),
	removePeerConsumer: (peerId, consumerId) =>
		set(state => {
			const kind = Object.entries(state.peers[peerId].consumers).find(consumer => consumer[1] === consumerId)?.[0] ?? ''
			delete state.peers[peerId].consumers[kind]
			return { peers: { ...state.peers } }
		}),
	setProducers: producers => set(state => ({ producers: producers })),
	addProducer: producer => set(state => ({ producers: { ...state.producers, ...producer } })),
	removeProducer: producerId =>
		set(state => {
			delete state.producers[producerId]
			return { producers: { ...state.producers } }
		}),
	setConsumers: consumers => set(state => ({ consumers: consumers })),
	addConsumer: consumer => set(state => ({ consumers: { ...state.consumers, ...consumer } })),
	removeConsumer: consumerId =>
		set(state => {
			delete state.consumers[consumerId]
			return { consumers: { ...state.consumers } }
		}),

	reset: () => set(initialState),
}))

export default useMediasoupStore
