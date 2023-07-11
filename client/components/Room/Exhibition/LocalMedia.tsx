import useMediasoupStore from '@/store/mediasoup'
import { Me, MediaType } from '@/types'
import { Button } from '@chakra-ui/react'
import { Producer, Transport } from 'mediasoup-client/lib/types'
import Image from 'next/image'
import { useState } from 'react'

interface Props {
	producers: Map<string, Producer>
	producerTransport: Transport
	mediaType: MediaType
	me: Me
	controlProducer: (type: 'pause' | 'resume', producerId: string) => Promise<void>
}

const LocalMedia = ({ mediaType, me, controlProducer, producers, producerTransport }: Props) => {
	const [addMeProducer, addProducer, removeMeProducer, removeProducer] = useMediasoupStore(state => [
		state.addMeProducer,
		state.addProducer,
		state.removeMeProducer,
		state.removeProducer,
	])
	const [hasAudio, setHasAudio] = useState(mediaType === MediaType.AUDIO || mediaType === MediaType.ALL)
	const [hasVideo, setHasVideo] = useState(mediaType === MediaType.VIDEO || mediaType === MediaType.ALL)
	const [hasShare, setHasShare] = useState(false)
	const styles = {
		audioColorScheme: hasAudio ? 'teal' : 'gray',
		audioImg: hasAudio ? '/img/audio.svg' : '/img/audio_forbid.svg',
		videoColorScheme: hasVideo ? 'teal' : 'gray',
		videoImg: hasVideo ? '/img/video.svg' : '/img/video_forbid.svg',
		shareColorScheme: hasShare ? 'teal' : 'gray',
		shareImg: '/img/share.svg',
	}

	// 开启共享屏幕
	const publishShare = async () => {
		const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
		const shareProducer = await producerTransport.produce({ track: stream.getVideoTracks()[0] })
		console.log(shareProducer)
		addMeProducer('share', shareProducer.id.producerId)
		addProducer({
			[shareProducer.id.producerId]: {
				id: shareProducer.id.producerId,
				track: shareProducer.track,
				paused: shareProducer.paused,
			},
		})
		producers.set(shareProducer.id.producerId, shareProducer)
	}
	// 关闭共享屏幕
	const closeShare = async () => {
		const shareProducer = producers.get(me.producers.share)!
		shareProducer.close()

		removeMeProducer('share')
		removeProducer(me.producers.share)
		producers.delete(me.producers.share)
	}

	const handleAudio = () => {
		controlProducer(!hasAudio ? 'resume' : 'pause', me.producers.audio)
		setHasAudio(!hasAudio)
	}
	const handleVideo = () => {
		controlProducer(!hasVideo ? 'resume' : 'pause', me.producers.video)
		setHasVideo(!hasVideo)
	}
	const handleShare = () => {
		if (!hasShare) {
			publishShare()
		} else {
			closeShare()
		}
		setHasShare(!hasShare)
	}

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg">
			{/* 音视频 */}
			<div className="flex justify-center items-end w-[488px] h-[274.5px] select-none">
				<video id="localMedia" playsInline autoPlay className="h-full object-fill" muted />
			</div>
			{/* 如果没开视频时，显示头像 */}
			<div
				className={`absolute left-0 top-0 flex justify-center items-end w-[488px] h-[274.5px] select-none  bg-[rgba(49,49,49,0.9)] ${
					hasVideo ? 'z-[-1]' : 'z-10'
				}`}
			>
				<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
			</div>
			{/* 控制区 */}
			<div className="absolute flex flex-col gap-2 right-2 top-14 z-50">
				<Button className="w-[50px] h-[50px] rounded-full" colorScheme={styles.audioColorScheme} onClick={handleAudio}>
					<Image src={styles.audioImg} alt="forbid" width={18} height={18} />
				</Button>
				<Button className="w-[50px] h-[50px] rounded-full" colorScheme={styles.videoColorScheme} onClick={handleVideo}>
					<Image src={styles.videoImg} alt="forbid" width={18} height={18} />
				</Button>
				<Button className="w-[50px] h-[50px] rounded-full" colorScheme={styles.shareColorScheme} onClick={handleShare}>
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
