import { Me, MediaType, Peer } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'

interface Props {
	mediaType: MediaType
	me: Me
	peers: {
		[key: string]: Peer
	}
	controlProducer: (type: 'pause' | 'resume', producerId: string) => Promise<void>
}

const Exhibition = ({ mediaType, me, peers, controlProducer }: Props) => {
	return (
		<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
			<LocalMedia mediaType={mediaType} me={me} controlProducer={controlProducer} />
			{/* <Media /> */}
			{Object.values(peers).map(peer => (
				<RemoteMedia key={`remoteMedia-${peer.id}`} peer={peer} />
			))}
		</div>
	)
}

export default Exhibition
