import { MediaType } from '@/types'
import { create } from 'zustand'

interface State {
	username: string
	roomId: string
	mediaType: MediaType
}

interface Action {
	setUsername: (username: State['username']) => void
	setRoomId: (roomId: State['roomId']) => void
	setMediaType: (mediaType: State['mediaType']) => void
}

const useUserStore = create<State & Action>(set => ({
	username: '',
	roomId: '',
	mediaType: MediaType.ALL,

	setUsername: (username: State['username']) => set(() => ({ username: username })),
	setRoomId: (roomId: State['roomId']) => set(() => ({ roomId: roomId })),
	setMediaType: (mediaType: State['mediaType']) => set(() => ({ mediaType: mediaType })),
}))

export default useUserStore
