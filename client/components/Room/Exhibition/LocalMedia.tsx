import useMediasoupStore from '@/store/mediasoup'
import { Me, MediaType, SelfMediaType } from '@/types'
import { Button } from '@chakra-ui/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface Props {
	mediaType: MediaType
	me: Me
	publishAudio: () => Promise<void>
	publishVideo: () => Promise<void>
	publishShare: () => Promise<void>
	closeMedia: (type: SelfMediaType, producerId: string) => void
}

const LocalMedia = ({ mediaType, me, publishAudio, publishVideo, publishShare, closeMedia }: Props) => {
	const producers = useMediasoupStore(state => state.producers)
	const videoRef = useRef<HTMLVideoElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)
	const [hasAudio, setHasAudio] = useState(mediaType === MediaType.AUDIO || mediaType === MediaType.ALL)
	const [hasVideo, setHasVideo] = useState(mediaType === MediaType.VIDEO || mediaType === MediaType.ALL)
  const [hasShare, setHasShare] = useState(false)
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
		if (audioRef.current && me.producers.audio) {
			const stream = new MediaStream()
			stream.addTrack(producers[me.producers.audio].track!)
			audioRef.current.srcObject = stream
		}
	}, [me.producers.audio])
	useEffect(() => {
		if (videoRef.current && me.producers.video) {
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
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg">
			{/* 音视频 */}
			<div
				className={`flex justify-center items-end w-[488px] h-[274.5px] select-none ${videoEnabled ? '' : 'invisible'}`}
			>
				<video ref={videoRef} playsInline autoPlay muted className="h-full object-fill" />
				<audio ref={audioRef} autoPlay className="invisible" muted />
			</div>
			{/* 如果没开视频时，显示头像 */}
			<div
				className={`absolute left-0 top-0 flex justify-center items-end w-[488px] h-[274.5px] select-none ${
					videoEnabled ? 'z-[-1]' : 'z-10'
				}`}
			>
				<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
			</div>
			{/* 控制区 */}
			<div className="absolute flex flex-col gap-2 right-2 top-14 z-50 svgFill">
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
		</div>
	)
}

export default LocalMedia
