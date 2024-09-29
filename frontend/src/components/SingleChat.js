import { FormControl, Input, Box, Text, IconButton, Spinner, useToast } from "@chakra-ui/react";
import "./styles.css";
import { getSender, getSenderFull } from "../config/ChatLogic";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
// import Lottie from "react-lottie";
// import Lottie from "lottie-react";
import animationData from "../animations/typing.json";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
let socket;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [socketConnected, setSocketConnected] = useState(false);
    const toast = useToast();

    const { selectedChat, setSelectedChat, user, notification, setNotification, setChats } = ChatState();

    const fetchMessages = async () => {
        if (!selectedChat) return;

        try {
            const config = {
                headers: {
                Authorization: `Bearer ${user.token}`,
                },
            };

            setLoading(true);

            const { data } = await axios.get(
                `${process.env.REACT_APP_SERVER_BASE_URL}/api/message/${selectedChat._id}`,
                config
            );
            setMessages(data);
            setLoading(false);
        } catch (error) {
            toast({
                title: "Error Occured!",
                description: "Failed to Load the Messages",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
        }
    };

    const sendMessage = async (event) => {
        if (event.key === "Enter" && newMessage) {
            try {
                const config = {
                    headers: {
                        "Content-type": "application/json",
                        Authorization: `Bearer ${user.token}`,
                    },
                };
                const { data } = await axios.post(
                    `${process.env.REACT_APP_SERVER_BASE_URL}/api/message`,
                    {
                        content: newMessage,
                        chatId: selectedChat,
                    },
                    config
                );

                setChats((prevChats) => [data.chat, ...prevChats.filter(chat => chat._id != data.chat._id)]);
                setSelectedChat(data.chat);

                setNewMessage("");
                socket.emit("new message", data);
                setMessages([...messages, data]);
            } catch (error) {
                toast({
                    title: "Error Occured!",
                    description: "Failed to send the Message",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                    position: "bottom",
                });
            }
        }
    };

    const notificationRef = useRef(notification);
    const selectedChatRef = useRef(selectedChat);
    useEffect(() => {
        notificationRef.current = notification;
    }, [notification]);

    useEffect(() => {
        if(!selectedChatRef.current || (selectedChat && selectedChatRef.current._id != selectedChat._id)){//implemented because selectedChat changes on every new message in current chat
            fetchMessages();
        }
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    //Using a new useEffect for "message received" event to avoid stale closure
    //is inefficient in the case of socket since it registers multiple function handlers for the same event
    //everytime useEffect runs
    //therefore i am using useRef to combat stale closure
    //NOTE since messages and fetchAgain are used only in setState hook therefore i access the latest value 
    //using setState callback so that i have to make less refs
    useEffect(() => {
        socket = io(`${process.env.REACT_APP_SERVER_BASE_URL}`);
        socket.emit("setup", user);
        socket.on("connected", () => {
            setSocketConnected(true)
            console.log(socket.id);
        });
        socket.on("message recieved", (newMessageRecieved) => {
            setChats((prevChats) => [newMessageRecieved.chat, ...prevChats.filter(chat => chat._id != newMessageRecieved.chat._id)]);
            
            if(selectedChatRef.current && newMessageRecieved.chat._id == selectedChatRef.current._id){
                setSelectedChat(newMessageRecieved.chat);
            }

            if ((
                !selectedChatRef.current || // if chat is not selected or doesn't match current chat
                selectedChatRef.current._id !== newMessageRecieved.chat._id
            ) && newMessageRecieved.sender._id != user._id) {
                if (!notificationRef.current.includes(newMessageRecieved)) {
                    setNotification([newMessageRecieved, ...notificationRef.current]);
                }
            } else {
                setMessages((prevMessages) => [...prevMessages, newMessageRecieved]);
            }
        });
        socket.on("refreshGrps", ()=>{
            setFetchAgain((prevFetchAgain)=>!prevFetchAgain);
        });
    }, []);

    const typingHandler = (e) => {
        setNewMessage(e.target.value);
    };

    return (
        <>
        {selectedChat ? (
            <>
            <Text
                fontSize={{ base: "28px", md: "30px" }}
                pb={3}
                px={2}
                w="100%"
                fontFamily="Work sans"
                display="flex"
                justifyContent={{ base: "space-between" }}
                alignItems="center"
            >
                <IconButton
                    display={{ base: "flex", md: "none" }}
                    icon={<ArrowBackIcon />}
                    onClick={() => setSelectedChat("")}
                />
                {messages &&
                (!selectedChat.isGroupChat ? (
                    <>
                    {getSender(user, selectedChat.users)}
                    <ProfileModal
                        user={getSenderFull(user, selectedChat.users)}
                    />
                    </>
                ) : (
                    <>
                    {selectedChat.chatName.toUpperCase()}
                    <UpdateGroupChatModal
                        fetchMessages={fetchMessages}
                        fetchAgain={fetchAgain}
                        setFetchAgain={setFetchAgain}
                        socket={socket}
                    />
                    </>
                ))}
            </Text>
            <Box
                display="flex"
                flexDir="column"
                justifyContent="flex-end"
                p={3}
                bg="#E8E8E8"
                w="100%"
                h="100%"
                borderRadius="lg"
                overflowY="hidden"
            >
                {loading ? (
                    <Spinner
                        size="xl"
                        w={20}
                        h={20}
                        alignSelf="center"
                        margin="auto"
                    />
                    ) : (
                    <div className="messages">
                        <ScrollableChat messages={messages} />
                    </div>
                )}

                <FormControl
                    onKeyDown={sendMessage}
                    id="first-name"
                    isRequired
                    mt={3}
                >
                    <Input
                        variant="filled"
                        bg="#E0E0E0"
                        placeholder="Enter a message.."
                        value={newMessage}
                        onChange={typingHandler}
                    />
                </FormControl>
            </Box>
            </>
        ) : (
            // to get socket.io on same page
            <Box display="flex" alignItems="center" justifyContent="center" h="100%">
                <Text fontSize="3xl" pb={3} fontFamily="Work sans">
                    Click on a user to start chatting
                </Text>
            </Box>
        )}
        </>
    );
};

export default SingleChat;
