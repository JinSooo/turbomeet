import { Me, MediaType, Peer, SelfMediaType } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'
import LocalShareMedia from './LocalShareMedia'
import RemoteShareMedia from './RemoteShareMedia'
import { Fragment } from 'react'

interface Props {
	mediaType: MediaType
	me: Me
	peers: {
		[key: string]: Peer
	}
	publishAudio: () => Promise<void>
	publishVideo: () => Promise<void>
	publishShare: () => Promise<void>
	closeMedia: (type: SelfMediaType, producerId: string) => void
}

const Exhibition = ({ mediaType, me, peers, publishAudio, publishVideo, publishShare, closeMedia }: Props) => {
	return (
		<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
			{/* 本地端 */}
			<LocalMedia
				mediaType={mediaType}
				me={me}
				publishAudio={publishAudio}
				publishVideo={publishVideo}
				publishShare={publishShare}
				closeMedia={closeMedia}
			/>
			{/* 共享屏幕 */}
			{me.producers.share && <LocalShareMedia me={me} />}
			{/* 远程端 */}
			{Object.values(peers).map(peer => (
				<Fragment key={`remoteMedia-${peer.id}`}>
					<RemoteMedia peer={peer} />
					{peer.consumers.share && <RemoteShareMedia peer={peer} />}
				</Fragment>
			))}
		</div>
	)
}

export default Exhibition
