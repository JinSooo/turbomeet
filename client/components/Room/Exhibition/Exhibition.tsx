import { MediaType } from '@/types'
import LocalMedia from './LocalMedia'
import RemoteMedia from './RemoteMedia'

interface Props {
	username: string
	mediaType: MediaType
	peersMedia: string[]
}

const Exhibition = ({ username, mediaType, peersMedia }: Props) => {
	return (
		<div className="flex justify-center items-center flex-wrap gap-8 w-full h-full">
			<LocalMedia id="localMedia" mediaType={mediaType} username={username} />
			{/* <Media /> */}
			{peersMedia.map(peerId => (
				<RemoteMedia id={`remoteMedia-${peerId}`} key={`remoteMedia-${peerId}`} username={'remote'} />
			))}
		</div>
	)
}

export default Exhibition
