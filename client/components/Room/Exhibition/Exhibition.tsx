import { MediaType } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'
import { SelfInfo } from '../Room'
import { Producer } from 'mediasoup-client/lib/types'

interface Props {
	selfMedia: SelfInfo
	mediaType: MediaType
	peersMedia: string[]
	controlMedia: (type: 'pause' | 'resume', media: Producer) => Promise<void>
}

const Exhibition = ({ mediaType, peersMedia, selfMedia, controlMedia }: Props) => {
	return (
		<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
			<LocalMedia id="localMedia" mediaType={mediaType} selfMedia={selfMedia} controlMedia={controlMedia} />
			{/* <Media /> */}
			{peersMedia.map(peerId => (
				<RemoteMedia id={`remoteMedia-${peerId}`} key={`remoteMedia-${peerId}`} username={peerId.split('-')[1]} />
			))}
		</div>
	)
}

export default Exhibition
