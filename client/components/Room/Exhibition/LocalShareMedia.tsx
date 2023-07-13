import useMediasoupStore from '@/store/mediasoup'
import { Me } from '@/types'
import { useEffect, useRef } from 'react'
import ShareMedia from './ShareMedia'

interface Props {
	me: Me
}

const LocalShareMedia = ({ me }: Props) => {
	const producers = useMediasoupStore(state => state.producers)
	const videoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (videoRef.current) {
			const stream = new MediaStream()
			stream.addTrack(producers[me.producers.share].track!)
			videoRef.current.srcObject = stream
		}
	}, [me.producers.share])

	return <ShareMedia ref={videoRef} username={me.username} />
}

export default LocalShareMedia
