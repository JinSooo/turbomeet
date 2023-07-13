import useMediasoupStore from '@/store/mediasoup'
import { Peer } from '@/types'
import { useEffect, useRef } from 'react'

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

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg w-full h-[274.5px] sm:w-[488px]">
			{/* 音视频 */}
			<div className="flex justify-center items-end w-full h-full select-none">
				<video ref={videoRef} playsInline autoPlay className="h-full object-fill" muted />
			</div>
			{/* 用户名 */}
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px] z-50">
				<p>{peer.username + ' - ShareScreen'}</p>
			</div>
		</div>
	)
}

export default RemoteShareMedia
