import useMediasoupStore from '@/store/mediasoup'
import { Peer } from '@/types'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

interface Props {
	peer: Peer
}

const RemoteMedia = ({ peer }: Props) => {
	const consumers = useMediasoupStore(state => state.consumers)
	const videoRef = useRef<HTMLVideoElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)

	// 监听变化再渲染
	useEffect(() => {
		if (audioRef.current && peer.consumers.audio) {
			const stream = new MediaStream()
			stream.addTrack(consumers[peer.consumers.audio].track!)
			audioRef.current.srcObject = stream
		}
	}, [peer.consumers.audio])
	useEffect(() => {
		if (videoRef.current && peer.consumers.video) {
			const stream = new MediaStream()
			stream.addTrack(consumers[peer.consumers.video].track!)
			videoRef.current.srcObject = stream
		}
	}, [peer.consumers.video])

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg">
			{/* 音视频 */}
			<div className="flex justify-center items-end w-[488px] h-[274.5px] select-none">
				<video ref={videoRef} playsInline autoPlay className="h-full object-fill" />
				<audio ref={audioRef} autoPlay className="invisible" />
			</div>
			{/* 如果没开视频时，显示头像 */}
			<div className={`absolute left-0 top-0 flex justify-center items-end w-[488px] h-[274.5px] select-none`}>
				<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
			</div>
			{/* 用户名 */}
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px]">
				<p>{peer.username}</p>
			</div>
		</div>
	)
}

export default RemoteMedia
