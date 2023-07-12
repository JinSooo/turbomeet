'use client'

import Login from '@/components/Login'
import Room from '@/components/Room/Room'
import { useState } from 'react'

export default function Home() {
	const [isLogin, setIsLogin] = useState(false)

	return <>{isLogin ? <Room toLogin={() => setIsLogin(false)} /> : <Login login={() => setIsLogin(true)} />}</>
}
