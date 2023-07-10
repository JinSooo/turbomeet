import Image from 'next/image'

interface Props {
	id: string
	username: string
}

const RemoteMedia = ({ id, username }: Props) => {
	return (
		<div className="relative bg-[rgba(49,49,49,0.9)] hover:shadow-[0_0_8px_rgba(82,168,236,0.9)] rounded-lg">
			{/* 音视频 */}
			<div className="flex justify-center items-end w-[488px] h-[274.5px] select-none">
				<video id={id} playsInline autoPlay className="h-full object-fill" />
			</div>
			{/* 如果没开视频时，显示头像 */}
			<div className={`absolute left-0 top-0 flex justify-center items-end w-[488px] h-[274.5px] select-none`}>
				<Image src={'/img/avatar.svg'} alt="avatar" width={250} height={250} />
			</div>
			{/* 用户名 */}
			<div className="absolute bottom-2 left-2 bg-[#252525] text-white border-b-2 border-b-[#aeff00] select-none text-sm p-[4.8px]">
				<p>{username}</p>
			</div>
		</div>
	)
}

export default RemoteMedia
