export interface Me {
	id: string
	username: string
	producers: {
		audio: string
		video: string
	}
}

export interface Peer {
	id: string
	username: string
	consumers: string[]
}

export interface SelfProducer {
	id: string
	paused: boolean
	track: MediaStreamTrack | null
}

export interface PeerConsumer {
	id: string
	kind: string
	pausedLocally: boolean
	pausedRemotely: boolean
	track: MediaStreamTrack | null
}
