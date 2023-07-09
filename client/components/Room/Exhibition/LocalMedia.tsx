import { MediaType } from '@/types'
import { Button } from '@chakra-ui/react'
import Image from 'next/image'
import { useState } from 'react'

interface Props {
	id: string
	mediaType: MediaType
	username: string
}

const LocalMedia = ({ id, mediaType, username }: Props) => {
	const [hasAudio, setHasAudio] = useState(true)
	const [hasVideo, setHasVideo] = useState(true)
	const [hasShare, setHasShare] = useState(false)

	const styles = {
		audioColorScheme: hasAudio ? 'teal' : 'gray',
		audioImg: hasAudio ? '/img/audio.svg' : '/img/audio_forbid.svg',
		videoColorScheme: hasVideo ? 'teal' : 'gray',
		videoImg: hasVideo ? '/img/video.svg' : '/img/video_forbid.svg',
		shareColorScheme: hasShare ? 'teal' : 'gray',
		shareImg: '/img/share.svg',
		isShowVideo: mediaType === MediaType.FORBID ? false : true,
	}

	const handleAudio = () => setHasAudio(!hasAudio)
	const handleVideo = () => setHasVideo(!hasVideo)
	const handleShare = () => setHasShare(!hasShare)

	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg">
			{/* 音视频 */}
			<div className="flex justify-center items-end w-[488px] h-[274.5px] select-none">
				{styles.isShowVideo ? (
					<video id={id} playsInline autoPlay className="h-full object-fill" muted />
				) : (
					<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
				)}
			</div>
			{/* 控制区 */}
			<div className="absolute flex flex-col gap-2 right-2 top-14">
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
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px]">
				<p>{username}</p>
			</div>
		</div>
	)
}

export default LocalMedia
