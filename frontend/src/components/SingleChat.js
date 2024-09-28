import { FormControl, Input, Box, Text, IconButton, Spinner, useToast } from "@chakra-ui/react";
import "./styles.css";
import { getSender, getSenderFull } from "../config/ChatLogic";
import { useEffect, useState } from "react";
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
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [socketConnected, setSocketConnected] = useState(false);
    const toast = useToast();

    const { selectedChat, setSelectedChat, user, notification, setNotification } = ChatState();

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

    useEffect(() => {
        socket = io(`${process.env.REACT_APP_SERVER_BASE_URL}`);
        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));

        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        fetchMessages();

        selectedChatCompare = selectedChat;
        // eslint-disable-next-line
    }, [selectedChat]);

    useEffect(() => {
        socket.on("message recieved", (newMessageRecieved) => {
            if (
                !selectedChatCompare || // if chat is not selected or doesn't match current chat
                selectedChatCompare._id !== newMessageRecieved.chat._id
            ) {
                if (!notification.includes(newMessageRecieved)) {
                    setNotification([newMessageRecieved, ...notification]);
                    setFetchAgain(!fetchAgain);
                }
            } else {
                setMessages([...messages, newMessageRecieved]);
            }
        });
    });

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
