import useMediasoupStore from '@/store/mediasoup'
import { Peer } from '@/types'
import { useEffect, useRef } from 'react'
import ShareMedia from './ShareMedia'

interface Props {
	peer: Peer
}

const RemoteShareMedia = ({ peer }: Props) => {
	const consumers = useMediasoupStore(state => state.consumers)
	const videoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (videoRef.current) {
			const stream = new MediaStream()
			stream.addTrack(consumers[peer.consumers.share].track!)
			videoRef.current.srcObject = stream
		}
	}, [peer.consumers.share])

	return <ShareMedia ref={videoRef} username={peer.username} />
}

export default RemoteShareMedia
