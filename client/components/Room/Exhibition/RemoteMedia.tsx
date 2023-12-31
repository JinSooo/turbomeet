import useMediasoupStore from '@/store/mediasoup'
import { Peer } from '@/types'
import hark from 'hark'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface Props {
	peer: Peer
}

const RemoteMedia = ({ peer }: Props) => {
	const consumers = useMediasoupStore(state => state.consumers)
	const videoRef = useRef<HTMLVideoElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)
	const [audioVolume, setAudioVolume] = useState(0)
	const audioEnabled = peer.consumers.audio
	const videoEnabled = peer.consumers.video

	// 监听变化再渲染
	useEffect(() => {
		// 重置
		setAudioVolume(0)
		if (audioRef.current && peer.consumers.audio && consumers[peer.consumers.audio]) {
			const stream = new MediaStream()
			stream.addTrack(consumers[peer.consumers.audio].track!)
			audioRef.current.srcObject = stream

			// 音频可视化
			const audioEvents = hark(stream, { play: false })
			audioEvents.on('volume_change', (dBs, threshold) => {
				let volume = Math.round(Math.pow(10, dBs / 200) * 10)
				if (volume === 1) volume = 0
				if (volume !== audioVolume) setAudioVolume(volume)
			})
		}
	}, [peer.consumers.audio])
	useEffect(() => {
		if (videoRef.current && peer.consumers.video && consumers[peer.consumers.video]) {
			const stream = new MediaStream()
			stream.addTrack(consumers[peer.consumers.video].track!)
			videoRef.current.srcObject = stream
		}
	}, [peer.consumers.video])

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg w-full h-[274.5px] sm:w-[488px]">
			{/* 音视频 */}
			<div className={`flex justify-center items-end w-full h-full select-none ${videoEnabled ? '' : 'invisible'}`}>
				<video
					ref={videoRef}
					playsInline
					autoPlay
					className={`h-full object-fill ${videoEnabled ? '' : 'invisible'}`}
				/>
				<audio ref={audioRef} autoPlay className="invisible" />
			</div>
			{/* 如果没开视频时，显示头像 */}
			<div
				className={`absolute left-0 top-0 flex justify-center items-end w-full h-full select-none ${
					videoEnabled ? 'z-[-1]' : 'z-10'
				}`}
			>
				<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
			</div>
			{/* 用户名 */}
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px]">
				<p>{peer.username}</p>
			</div>
			{/* 音视频状态 */}
			<div className="absolute top-2 right-2 select-none flex gap-2">
				{!audioEnabled && <Image src={'/img/audio_forbid.svg'} alt="audio" width={18} height={18} />}
				{!videoEnabled && <Image src={'/img/video_forbid.svg'} alt="audio" width={18} height={18} />}
			</div>
			{/* 音量可视化 */}
			<div className="absolute top-0 right-0 z-50 h-full flex items-center">
				{peer.consumers.audio && (
					<div className={`w-1 rounded-md bg-yellow-200 duration-300 level${audioVolume}`}></div>
				)}
			</div>
		</div>
	)
}

export default RemoteMedia
