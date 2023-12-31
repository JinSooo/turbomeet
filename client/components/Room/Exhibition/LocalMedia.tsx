import useMediasoupStore from '@/store/mediasoup'
import { Me, MediaType, SelfMediaType } from '@/types'
import { Button } from '@chakra-ui/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import hark from 'hark'
import useUserStore from '@/store/user'

interface Props {
	me: Me
	publishAudio: (audioId?: string) => Promise<void>
	publishVideo: (videoId?: string) => Promise<void>
	publishShare: () => Promise<void>
	closeMedia: (type: SelfMediaType, producerId: string) => void
}

const LocalMedia = ({ me, publishAudio, publishVideo, publishShare, closeMedia }: Props) => {
	const mediaType = useUserStore(state => state.mediaType)
	const producers = useMediasoupStore(state => state.producers)
	const videoRef = useRef<HTMLVideoElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)
	const [hasAudio, setHasAudio] = useState(mediaType === MediaType.AUDIO || mediaType === MediaType.ALL)
	const [hasVideo, setHasVideo] = useState(mediaType === MediaType.VIDEO || mediaType === MediaType.ALL)
	const [hasShare, setHasShare] = useState(false)
	const [audioVolume, setAudioVolume] = useState(0)
	const videoEnabled = !!me.producers.video
	const styles = {
		audioColorScheme: hasAudio ? 'teal' : 'gray',
		audioImg: hasAudio ? '/img/audio.svg' : '/img/audio_forbid.svg',
		videoColorScheme: hasVideo ? 'teal' : 'gray',
		videoImg: hasVideo ? '/img/video.svg' : '/img/video_forbid.svg',
		shareColorScheme: hasShare ? 'teal' : 'gray',
		shareImg: '/img/share.svg',
	}

	const handleAudio = () => {
		!hasAudio ? publishAudio() : closeMedia('audio', me.producers.audio)
		setHasAudio(!hasAudio)
	}
	const handleVideo = () => {
		!hasVideo ? publishVideo() : closeMedia('video', me.producers.video)
		setHasVideo(!hasVideo)
	}
	const handleShare = () => {
		!hasShare ? publishShare() : closeMedia('share', me.producers.share)
		setHasShare(!hasShare)
	}

	// 监听变化再渲染
	useEffect(() => {
		setHasAudio(!!me.producers.audio)
		if (audioRef.current && me.producers.audio && producers[me.producers.audio]) {
			const stream = new MediaStream()
			stream.addTrack(producers[me.producers.audio].track!)
			audioRef.current.srcObject = stream

			// 音频可视化
			const audioEvents = hark(stream, { play: false })
			audioEvents.on('volume_change', (dBs, threshold) => {
				// The exact formula to convert from dBs (-100..0) to linear (0..1) is:
				//   Math.pow(10, dBs / 20)
				// However it does not produce a visually useful output, so let exagerate
				// it a bit. Also, let convert it from 0..1 to 0..10 and avoid value 1 to
				// minimize component renderings.
				let volume = Math.round(Math.pow(10, dBs / 200) * 10)
				if (volume === 1) volume = 0
				if (volume !== audioVolume) setAudioVolume(volume)
			})
		}
	}, [me.producers.audio])
	useEffect(() => {
		setHasVideo(!!me.producers.video)
		if (videoRef.current && me.producers.video && producers[me.producers.video]) {
			const stream = new MediaStream()
			stream.addTrack(producers[me.producers.video].track!)
			videoRef.current.srcObject = stream
		}
	}, [me.producers.video])
	// 当点击特殊按钮关闭时，异步同步按钮状态
	useEffect(() => {
		setHasShare(!!me.producers.share)
	}, [me.producers.share])

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg w-full h-[274.5px] sm:w-[488px]">
			{/* 音视频 */}
			<div className={`flex justify-center items-end select-none w-full h-full ${videoEnabled ? '' : 'invisible'}`}>
				<video ref={videoRef} playsInline autoPlay muted className="h-full object-fill" />
				<audio ref={audioRef} autoPlay className="invisible" muted />
			</div>
			{/* 如果没开视频时，显示头像 */}
			<div
				className={`absolute left-0 top-0 flex justify-center items-end w-full h-full select-none ${
					videoEnabled ? 'z-[-1]' : 'z-10'
				}`}
			>
				<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
			</div>
			{/* 控制区 */}
			<div className="absolute flex flex-col gap-2 right-2 top-14 z-50">
				<Button
					className="!w-[50px] !h-[50px] !rounded-full"
					colorScheme={styles.audioColorScheme}
					onClick={handleAudio}
				>
					<Image src={styles.audioImg} alt="forbid" width={18} height={18} />
				</Button>
				<Button
					className="!w-[50px] !h-[50px] !rounded-full"
					colorScheme={styles.videoColorScheme}
					onClick={handleVideo}
				>
					<Image src={styles.videoImg} alt="forbid" width={18} height={18} />
				</Button>
				<Button
					className="!w-[50px] !h-[50px] !rounded-full"
					colorScheme={styles.shareColorScheme}
					onClick={handleShare}
				>
					<Image src={styles.shareImg} alt="forbid" width={18} height={18} />
				</Button>
			</div>
			{/* 用户名 */}
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px] z-50">
				<p>{me.username}</p>
			</div>
			{/* 音量可视化 */}
			<div className="absolute top-0 right-0 z-50 h-full flex items-center">
				{me.producers.audio && <div className={`w-1 rounded-md bg-yellow-200 duration-300 level${audioVolume}`}></div>}
			</div>
		</div>
	)
}

export default LocalMedia
