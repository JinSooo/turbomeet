'use client'

import useMediasoupStore from '@/store/mediasoup'
import useUserStore from '@/store/user'
import { MediaType } from '@/types'
import { Button, ButtonGroup, Card, CardBody, CardHeader, Heading, Input, Text, useToast } from '@chakra-ui/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { shallow } from 'zustand/shallow'

interface Props {
	login: () => void
}

// 随机生成一个房间号
const initialRoomId = Math.random().toString(36).substring(2)

const Login = ({ login }: Props) => {
	const [setStoreUsername, setStoreRoomId, setGlobalMediaType] = useUserStore(
		state => [state.setUsername, state.setRoomId, state.setMediaType],
		shallow,
	)
	const [setMeId, setMeUsername] = useMediasoupStore(state => [state.setMeId, state.setMeUsername])
	const toast = useToast({ position: 'bottom-right' })
	const [mediaType, setMediaType] = useState(MediaType.ALL)
	const [roomId, setRoomId] = useState(initialRoomId)
	const [username, setUsername] = useState('')

	// 修改Media状态
	const handleMediaSelected = (type: MediaType) => setMediaType(type)

	const join = () => {
		if (!roomId) return toast({ status: 'warning', description: 'Please enter a room ID' })
		if (!username) return toast({ status: 'warning', description: 'Please enter a username' })

		setStoreUsername(username)
		setStoreRoomId(roomId)
		setGlobalMediaType(mediaType)
		setMeId(roomId + '-' + username)
		setMeUsername(username)
		toast({ status: 'success', description: 'join' })
		login()
	}

	useEffect(() => {
		// RoomId已经存在，则读取
		if (window.location.search) {
			const roomId = window.location.search.split('=')[1]
			window.history.pushState(null, '', '?roomId=' + roomId)
			setRoomId(roomId)
		}
		// 否则，随机生成
		else {
			window.history.pushState(null, '', '?roomId=' + initialRoomId)
		}
	}, [])

	return (
		<div className="flex justify-center items-center w-full h-full bg-[#72778f]">
			<Card className="w-full m-4 md:w-1/2 xl:w-1/3">
				<CardHeader>
					<Heading size="lg">TurboMeet</Heading>
				</CardHeader>
				<CardBody>
					{/* 房间号和用户名 */}
					<div>
						<Text mb="8px">Room ID:</Text>
						<Input placeholder="Input your roomID" value={roomId} onChange={e => setRoomId(e.target.value)} />
					</div>
					<div className="mt-4">
						<Text mb="8px">Username:</Text>
						<Input placeholder="Input your username" value={username} onChange={e => setUsername(e.target.value)} />
					</div>
					<div className="flex justify-between items-end mt-8 ">
						{/* 音视频选择 */}
						<div>
							<Text mb="8px">Choose Media</Text>
							<ButtonGroup isAttached className="text-black">
								<Button
									colorScheme={mediaType === MediaType.FORBID ? 'teal' : 'gray'}
									onClick={() => handleMediaSelected(MediaType.FORBID)}
								>
									<Image src="/img/forbid.svg" alt="forbid" width={18} height={18} />
								</Button>
								<Button
									colorScheme={mediaType === MediaType.AUDIO ? 'teal' : 'gray'}
									onClick={() => handleMediaSelected(MediaType.AUDIO)}
								>
									<Image src="/img/audio.svg" alt="forbid" width={18} height={18} />
								</Button>
								<Button
									colorScheme={mediaType === MediaType.VIDEO ? 'teal' : 'gray'}
									onClick={() => handleMediaSelected(MediaType.VIDEO)}
								>
									<Image src="/img/video.svg" alt="forbid" width={18} height={18} />
								</Button>
								<Button
									colorScheme={mediaType === MediaType.ALL ? 'teal' : ''}
									onClick={() => handleMediaSelected(MediaType.ALL)}
								>
									<Image src="/img/audio.svg" alt="forbid" width={18} height={18} />
									&nbsp;
									<Image src="/img/video.svg" alt="forbid" width={18} height={18} />
								</Button>
							</ButtonGroup>
						</div>
						<Button colorScheme="teal" onClick={join}>
							Join
						</Button>
					</div>
				</CardBody>
			</Card>
		</div>
	)
}

export default Login
