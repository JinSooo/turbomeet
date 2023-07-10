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
	setMeUsername: (username: Me['username']) => void
	setMeProducers: (producers: Me['producers']) => void
	setPeers: (peers: State['peers']) => void
	addPeer: (peerId: string) => void
	removePeer: (peerId: string) => void
	addPeerConsumer: (peerId: string, consumerId: string) => void
	setProducers: (producers: State['producers']) => void
	addProducer: (producer: State['producers']) => void
	setConsumers: (consumers: State['consumers']) => void
	addConsumer: (producer: State['consumers']) => void
}

const useMediasoupStore = create<State & Action>(set => ({
	me: {
		id: '',
		username: '',
		producers: {
			audio: '',
			video: '',
		},
	},
	peers: {},
	producers: {},
	consumers: {},

	setMeId: id => set(state => ({ me: { ...state.me, id } })),
	setMeUsername: username => set(state => ({ me: { ...state.me, username } })),
	setMeProducers: producers => set(state => ({ me: { ...state.me, producers: producers } })),
	setPeers: peers => set(state => ({ peers: peers })),
	addPeer: peerId =>
		set(state => {
			if (!state.peers[peerId]) {
				state.peers[peerId] = {
					id: peerId,
					username: peerId.split('-')[1],
					consumers: [],
				}
			}

			return { peers: { ...state.peers } }
		}),
	removePeer: peerId =>
		set(state => {
			delete state.peers[peerId]
			return { peers: { ...state.peers } }
		}),
	addPeerConsumer: (peerId, consumerId) =>
		set(state => {
			state.peers[peerId].consumers.push(consumerId)
			return { peers: { ...state.peers } }
		}),
	setProducers: producers => set(state => ({ producers: producers })),
	addProducer: producer => set(state => ({ producers: { ...state.producers, ...producer } })),
	setConsumers: consumers => set(state => ({ consumers: consumers })),
	addConsumer: consumer => set(state => ({ consumers: { ...state.consumers, ...consumer } })),
}))

export default useMediasoupStore
