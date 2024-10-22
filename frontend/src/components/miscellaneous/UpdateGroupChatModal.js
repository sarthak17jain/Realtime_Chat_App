import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  FormControl,
  Input,
  useToast,
  Box,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";

const UpdateGroupChatModal = ({ fetchMessages, fetchAgain, setFetchAgain, socket }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [groupChatName, setGroupChatName] = useState();
    // const [search, setSearch] = useState("");
    const [searchResult, setSearchResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [renameloading, setRenameLoading] = useState(false);
    const toast = useToast();

    const { selectedChat, setSelectedChat, user } = ChatState();

    const handleSearch = async (query) => {
        // setSearch(query);
        if (!query) {
            setSearchResult([]);
            return;
        }

        try {
            setLoading(true);
            const config = {
                headers: {
                Authorization: `Bearer ${user.token}`,
                },
            };
            const { data } = await axios.get(`${process.env.REACT_APP_SERVER_BASE_URL}/api/user?search=${query}`, config);
            setLoading(false);
            setSearchResult(data);
        } catch (error) {
            toast({
                title: "Error Occured!",
                description: "Failed to Load the Search Results",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom-left",
            });
            setLoading(false);
        }
    };

    const handleRename = async () => {
        if (!groupChatName) return;

        try {
            setRenameLoading(true);
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            const { data } = await axios.put(
                `${process.env.REACT_APP_SERVER_BASE_URL}/api/chat/rename`,
                {
                    chatId: selectedChat.id,
                    chatName: groupChatName,
                },
                config
            );

            socket.emit("groupModified", data.users);
            setFetchAgain(!fetchAgain);//selectedChat is updated by fetchAgain
            setRenameLoading(false);
        } catch (error) {
            toast({
                title: "Error Occured!",
                description: error.response.data.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setRenameLoading(false);
        }
        setGroupChatName("");
    };

    const handleAddUser = async (user1) => {
        setSearchResult([]);
        if (selectedChat.users.find((u) => u.id === user1.id)) {
            toast({
                title: "User Already in group!",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            return;
        }

        if (selectedChat.groupAdmin.id !== user.id) {
            toast({
                title: "Only admins can add someone!",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            return;
        }

        try {
            setLoading(true);
            const config = {
                headers: {
                Authorization: `Bearer ${user.token}`,
                },
            };
            const { data } = await axios.put(
                `${process.env.REACT_APP_SERVER_BASE_URL}/api/chat/groupadd`,
                {
                    chatId: selectedChat.id,
                    userId: user1.id,
                },
                config
            );

            socket.emit("groupModified", data.users);
            setFetchAgain(!fetchAgain);//selectedChat is updated by fetchAgain
            setLoading(false);
        } catch (error) {
            toast({
                title: "Error Occured!",
                description: error.response.data.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setLoading(false);
        }
        setGroupChatName("");
    };

    const handleRemove = async (user1) => {
        if (selectedChat.groupAdmin.id !== user.id && user1.id !== user.id) {
            toast({
                title: "Only admins can remove someone!",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            return;
        }

        try {
            setLoading(true);
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            const response = await axios.put(
                `${process.env.REACT_APP_SERVER_BASE_URL}/api/chat/groupremove`,
                {
                    chatId: selectedChat.id,
                    userId: user1.id,
                },
                config
            );
            const { data } = response;
            if(data.users){
                socket.emit("groupModified", [user1, ...data.users]);
            }
            setFetchAgain(!fetchAgain);//selectedChat is updated by fetchAgain
            fetchMessages();
            setLoading(false);
        } catch (error) {
            toast({
                title: "Error Occured!",
                description: error.response.data.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setLoading(false);
        }
        setGroupChatName("");
    };

    const handleClose = () => {
        setSearchResult([]);
        setGroupChatName("");
        onClose();
    };

    return (
    <>
        <IconButton display={{ base: "flex" }} icon={<ViewIcon />} onClick={onOpen} />

        <Modal onClose={handleClose} isOpen={isOpen} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader
                    fontSize="35px"
                    fontFamily="Work sans"
                    display="flex"
                    justifyContent="center"
                >
                    {selectedChat.chatName}
                </ModalHeader>

                <ModalCloseButton />
                <ModalBody display="flex" flexDir="column" alignItems="center">
                    <Box w="100%" display="flex" flexWrap="wrap" pb={3}>
                        {selectedChat.users.map((u) => (
                            <UserBadgeItem
                                key={u.id}
                                user={u}
                                adminId={selectedChat.groupAdmin.id}
                                handleFunction={() => handleRemove(u)}
                            />
                        ))}
                    </Box>
                    <FormControl display="flex">
                        <Input
                            placeholder="Chat Name"
                            mb={3}
                            value={groupChatName}
                            onChange={(e) => setGroupChatName(e.target.value)}
                        />
                        <Button
                            variant="solid"
                            colorScheme="teal"
                            ml={1}
                            isLoading={renameloading}
                            onClick={handleRename}
                        >
                            Update
                        </Button>
                    </FormControl>
                    <FormControl>
                        <Input
                            placeholder="Add User to group"
                            mb={1}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </FormControl>

                    {loading ? (
                        <Spinner size="lg" />
                    ) : (
                        searchResult?.map((user) => (
                        <UserListItem
                            key={user.id}
                            user={user}
                            handleFunction={() => handleAddUser(user)}
                        />
                        ))
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => handleRemove(user)} colorScheme="red">
                        Leave Group
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    </>
    );
};

export default UpdateGroupChatModal;
