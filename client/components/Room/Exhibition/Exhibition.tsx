import { Me, MediaType, Peer, SelfMediaType } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'
import LocalShareMedia from './LocalShareMedia'
import RemoteShareMedia from './RemoteShareMedia'
import { Fragment } from 'react'

interface Props {
	me: Me
	peers: {
		[key: string]: Peer
	}
	publishAudio: (audioId?: string) => Promise<void>
	publishVideo: (videoId?: string) => Promise<void>
	publishShare: () => Promise<void>
	closeMedia: (type: SelfMediaType, producerId: string) => void
}

const Exhibition = ({ me, peers, publishAudio, publishVideo, publishShare, closeMedia }: Props) => {
	return (
		<div className="flex justify-center content-start flex-wrap gap-8 w-full h-full box-border py-8">
			{/* 本地端 */}
			<LocalMedia
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
