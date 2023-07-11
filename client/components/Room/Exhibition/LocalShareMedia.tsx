import useMediasoupStore from '@/store/mediasoup'
import { Me } from '@/types'
import { useEffect, useRef } from 'react'

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

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg">
			{/* 音视频 */}
			<div className="flex justify-center items-end w-[488px] h-[274.5px] select-none">
				<video ref={videoRef} playsInline autoPlay className="h-full object-fill" muted />
			</div>
			{/* 用户名 */}
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px] z-50">
				<p>{me.username + 'ShareScreen'}</p>
			</div>
		</div>
	)
}

export default LocalShareMedia
