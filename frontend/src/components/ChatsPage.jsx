import React from 'react'
import { PrettyChatWindow } from 'react-chat-engine-pretty'
const ChatsPage = (props) => {
    return (
        <div style={{ height: '100vh' }}>
            <PrettyChatWindow
                projectId='1330dcfa-767d-4adb-a93f-b265cc9732c8'
                username={props.user.username}
                secret={props.user.secret}
                style={{ height: '100%' }}
            />
        </div>
    )
}

export default ChatsPage