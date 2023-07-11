export interface Me {
	id: string
	username: string
	producers: {
		[key: string]: string
	}
}

export interface Peer {
	id: string
	username: string
	consumers: {
		[key: string]: string
	}
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
