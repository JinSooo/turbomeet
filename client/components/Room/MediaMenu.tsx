import {
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	IconButton,
	useDisclosure,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalCloseButton,
	ModalBody,
	ModalFooter,
	Button,
	Select,
	Input,
} from '@chakra-ui/react'
import { HamburgerIcon, SettingsIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { ChangeEvent, KeyboardEvent, useState } from 'react'
import useMediasoupStore from '@/store/mediasoup'
import { SelfMediaType } from '@/types'

interface Props {
	audioDevices: MediaDeviceInfo[]
	videoDevices: MediaDeviceInfo[]
	publishAudio: (audioId?: string) => Promise<void>
	publishVideo: (videoId?: string) => Promise<void>
	closeMedia: (type: SelfMediaType, producerId: string) => void
	leave: () => void
	sendChatMessage: (message: string) => void
}

const MediaMenu = ({
	audioDevices,
	videoDevices,
	publishAudio,
	publishVideo,
	closeMedia,
	leave,
	sendChatMessage,
}: Props) => {
	const [me, setMeAudioId, setMeVideoId] = useMediasoupStore(state => [
		state.me,
		state.setMeAudioId,
		state.setMeVideoId,
	])
	const { isOpen, onOpen, onClose } = useDisclosure()
	const [message, setMessage] = useState('')

	const selectAudioDevice = (e: ChangeEvent<HTMLSelectElement>) => {
		// 避免重复渲染
		if (me.audioId === e.target.value) return

		setMeAudioId(e.target.value)
		closeMedia('audio', me.producers.audio)
		publishAudio(e.target.value)
	}
	const selectVideoDevice = (e: ChangeEvent<HTMLSelectElement>) => {
		// 避免重复渲染
		if (me.videoId === e.target.value) return

		setMeVideoId(e.target.value)
		closeMedia('video', me.producers.video)
		publishVideo(e.target.value)
	}
	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		setMessage(e.target.value)
	}
	const handleInputSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== 'Enter') return

		e.preventDefault()
		sendChatMessage(message.trim())
		setMessage('')
	}

	return (
		<div className="w-full flex justify-between">
			<Menu>
				<MenuButton
					as={IconButton}
					aria-label="Options"
					icon={<HamburgerIcon color={'#fff'} fontSize={20} />}
					variant="link"
				/>
				<MenuList className="ml-[10px]">
					{/* 音视频控制 Button */}
					<MenuItem icon={<SettingsIcon />} onClick={onOpen}>
						MediaChange
					</MenuItem>
				</MenuList>
			</Menu>
			<Input
				width={250}
				placeholder="Write here..."
				color={'white'}
				value={message}
				onChange={e => handleInputChange(e)}
				onKeyDown={e => handleInputSubmit(e)}
			/>
			<IconButton
				aria-label="Leave"
				icon={<ExternalLinkIcon color={'#fff'} fontSize={20} />}
				variant="link"
				onClick={leave}
			/>
			{/* 音视频控制 Modal */}
			<Modal isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>MediaChange</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<div className="mb-6">
							<p className="mb-2">Choose a audio device:</p>
							<Select onChange={e => selectAudioDevice(e)} defaultValue={me.audioId}>
								{audioDevices.map(device => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label}
									</option>
								))}
							</Select>
						</div>
						<div className="mb-2">
							<p className="mb-2">Choose a video device:</p>
							<Select onChange={e => selectVideoDevice(e)} defaultValue={me.videoId}>
								{videoDevices.map(device => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label}
									</option>
								))}
							</Select>
						</div>
					</ModalBody>

					<ModalFooter>
						<Button colorScheme="teal" onClick={onClose}>
							Close
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</div>
	)
}

export default MediaMenu
