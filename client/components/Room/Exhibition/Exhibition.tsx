import { Me, MediaType, Peer } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'
import ShareMedia from './ShareMedia'
import { Producer, Transport } from 'mediasoup-client/lib/types'

interface Props {
	producers: Map<string, Producer>
	producerTransport: Transport
	mediaType: MediaType
	me: Me
	peers: {
		[key: string]: Peer
	}
	controlProducer: (type: 'pause' | 'resume', producerId: string) => Promise<void>
}

const Exhibition = ({ mediaType, me, peers, controlProducer, producers, producerTransport }: Props) => {
	return (
		<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
			{/* 本地端 */}
			<LocalMedia
				mediaType={mediaType}
				me={me}
				controlProducer={controlProducer}
				producers={producers}
				producerTransport={producerTransport}
			/>
			{/* 共享屏幕 */}
			{me.producers.share && <ShareMedia me={me} />}
			{/* 远程端 */}
			{Object.values(peers).map(peer => (
				<RemoteMedia key={`remoteMedia-${peer.id}`} peer={peer} />
			))}
		</div>
	)
}

export default Exhibition
