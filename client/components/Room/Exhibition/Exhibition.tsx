import { Me, MediaType, Peer } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'

interface Props {
	mediaType: MediaType
	me: Me
	peers: {
		[key: string]: Peer
	}
	controlMedia: (type: 'pause' | 'resume', media: string) => Promise<void>
}

const Exhibition = ({ mediaType, me, peers, controlMedia }: Props) => {
	return (
		<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
			<LocalMedia mediaType={mediaType} me={me} controlMedia={controlMedia} />
			{/* <Media /> */}
			{Object.values(peers).map(peer => (
				<RemoteMedia key={`remoteMedia-${peer.id}`} peer={peer} />
			))}
		</div>
	)
}

export default Exhibition
