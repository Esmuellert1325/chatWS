import React from "react";
import {over} from 'stompjs';
import SockJS from 'sockjs-client';

var stompClient = null; // Ha a user csatlakozik, akkor lesz értéke
export default function ChatRoom() {
    const [createdSuccesfully, setCreatedSuccesfully] = React.useState(false);
    const [isTaken, setIsTaken] = React.useState(false);
    const [wantToRegister, setWantToRegister] = React.useState(false);
    const [incorrectCredentials, setIncorrectCredentials] = React.useState(false);
    const [publicChats, setPublicChats] = React.useState([]);
    const [privateChats, setPrivateChats] = React.useState(new Map());
    const [tab, setTab] = React.useState('CHATROOM');
    const [userData, setUserData] = React.useState({
        username: "",
        password: "",
        receiverName: "",
        messageContent: "",
        connected: false
    });

    function handleValue(event) {
        const {value, name} = event.target;
        setUserData({...userData, [name]:value});
    }

    function loginUser() {
        let retreivedData = JSON.parse(localStorage.getItem('chatUsers'));
        if (userData.username in retreivedData && retreivedData[userData.username] === userData.password) {
            let Sock = new SockJS('http://localhost:8080/websock');
            stompClient = over(Sock);
            stompClient.connect({}, onConnected, onError);
        } 
        else setIncorrectCredentials(true);
    }

    function onConnected() {
        setUserData({...userData, "connected": true});
        stompClient.subscribe('/chatroom/public', onPublicMessageReceived);
        stompClient.subscribe('/user/'+userData.username+'/private', onPrivateMessageReceived);
        userJoin();
    }

    function userJoin() {
        let chatMessage = {
            senderName:userData.username,
            status: 'JOIN'
        };
        stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
    }

    function onPublicMessageReceived(payload) {
        let payloadData = JSON.parse(payload.body);
        switch (payloadData.status) {
            case 'JOIN':
                if (!privateChats.get(payloadData.senderName)) {
                    privateChats.set(payloadData.senderName, []);
                    setPrivateChats(new Map(privateChats));
                }
                break;
            case 'MESSAGE':
                publicChats.push(payloadData);
                setPublicChats([...publicChats]);
                break;
            // eslint-disable-next-line
        }
    }

    function onPrivateMessageReceived(payload) {
        let payloadData = JSON.parse(payload.body);
        if (privateChats.get(payloadData.senderName)) {
            privateChats.get(payloadData.senderName).push(payloadData);
            setPrivateChats(new Map(privateChats));
        }
        else {
            let list = [];
            list.push(payloadData);
            privateChats.set(payloadData.senderName, list);
            setPrivateChats(new Map(privateChats));
        }
    }

    function onError(err) {
        console.error(err);
    }

    function sendPublicMessage() {
        if (stompClient) {
            let chatMessage = {
                senderName:userData.username,
                message:userData.messageContent,
                status: 'MESSAGE'
            };
            stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
            setUserData({...userData, 'message' : ''});
        }
    }

    function sendPrivateMessage() {
        if (stompClient) {
            let chatMessage = {
                senderName:userData.username,
                receiverName: tab,
                message:userData.messageContent,
                status: 'MESSAGE'
            };
            if (userData !== tab) {
                privateChats.get(tab).push(chatMessage);
                setPrivateChats(new Map(privateChats));
            }
            stompClient.send('/app/private-message', {}, JSON.stringify(chatMessage));
            setUserData({...userData, 'message' : ''});
        }
    }

    function createNewUser() {
        let retreivedData = JSON.parse(localStorage.getItem('chatUsers'));
        if (userData.username in retreivedData) {
            setIsTaken(true);
        }
        else if (!(userData.username in retreivedData) && userData.username !== '' && userData.password !== ''){
            setIsTaken(false);
            setCreatedSuccesfully(true);
            setTimeout(()=> {
                setCreatedSuccesfully(false);
            }, 3000)
            retreivedData[userData.username] = userData.password;
            localStorage.setItem('chatUsers', JSON.stringify(retreivedData));
        }
    }

    return (
        <div className="container">
            {userData.connected?
                <div className="chat-box">
                    <div className="member-list">
                        <ul>
                            <li onClick={() => {setTab('CHATROOM')}} className={`member ${tab==="CHATROOM" && "active"}`}>Chatroom</li>
                            {[...privateChats.keys()].map((name, index) => (
                                <li onClick={() => {setTab(name)}} className={`member ${tab === name && 'active'}`} key={index}>
                                    {name}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {tab === 'CHATROOM' && <div className="chat-content">
                        <ul className="chat-messages">
                            {publicChats.map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                    {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                                    <div className="message-data">{chat.message}</div>
                                    {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                                </li>
                            ))}
                        </ul>

                        <div className="send-message">
                            <input type="text" name="messageContent" className="input-message" placeholder="Enter your message" 
                                value={userData.messageContent}
                                onChange={handleValue}
                            />
                            <button type="button" className="send-button" onClick={sendPublicMessage}>Send</button>
                        </div>
                    </div>}
                    {tab !== 'CHATROOM' && <div className="chat-content">
                        <ul className="chat-messages">
                            {[...privateChats.get(tab)].map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                    {ChatRoom.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                                    <div className="message-data">{chat.message}</div>
                                    {ChatRoom.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                                </li>
                            ))}
                        </ul>

                        <div className="send-message">
                            <input type="text" className="input-message" name="messageContent" 
                                placeholder={`Enter your message for ${tab}`} 
                                value={userData.messageContent}
                                onChange={handleValue}
                            />
                            <button type="button" className="send-button" onClick={sendPrivateMessage}>Send</button>
                        </div>
                    </div>}
                </div> 
            :
                wantToRegister ? 
                    <div className="register">
                        <h1>Create new account</h1>
                        <input
                            id="user-name"
                            name='username'
                            placeholder="Enter your username"
                            value={userData.username}
                            onChange={handleValue}
                        />
                        <input
                            id="password"
                            name='password'
                            type='password'
                            placeholder="Enter your password"
                            value={userData.password}
                            onChange={handleValue}
                        />
                        <button type="button" onClick={createNewUser}>Create User</button>
                        <button type="button" onClick={() => setWantToRegister(!wantToRegister)}>Return to login page</button>
                        {isTaken && <p className="error-message">Error! Username already taken!</p>}
                        {createdSuccesfully && <p className="succesfull-message">Success! New user created!</p>}
                    </div>
                :
                    <div className="register">
                        <h1>Login to Chat</h1>
                        <input
                            id="user-name"
                            name='username'
                            placeholder="Enter your username"
                            value={userData.username}
                            onChange={handleValue}
                        />
                        <input
                            id="password"
                            name='password'
                            type='password'
                            placeholder="Enter your password"
                            value={userData.password}
                            onChange={handleValue}
                        />
                        <button type="button" onClick={loginUser}>Connect</button>
                        <button type="button" onClick={() => setWantToRegister(!wantToRegister)}>No account yet? Create one!</button>
                        {incorrectCredentials && <p className="error-message">Error! Incorrect credentials!</p>}
                    </div>
            }
        </div>
    )
}