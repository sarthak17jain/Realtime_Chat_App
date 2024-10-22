import { Avatar, Tooltip } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogic";
import { ChatState } from "../Context/ChatProvider";

const ScrollableChat = ({ messages }) => {
    const { user } = ChatState();

    return (
        <ScrollableFeed>
            {messages &&
                messages.map((m, i) => (
                    <div style={{ display: "flex" }} key={m.id}>
                        {(isSameSender(messages, m, i, user.id) ||
                            isLastMessage(messages, i, user.id)) && (
                            <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                                <Avatar
                                mt="7px"
                                mr={1}
                                size="sm"
                                cursor="pointer"
                                name={m.sender.name}
                                src={m.sender.pic}
                            />
                            </Tooltip>
                        )}
                        <span
                        style={{
                            backgroundColor: `${
                            m.sender.id === user.id ? "#BEE3F8" : "#B9F5D0"
                            }`,
                            marginLeft: isSameSenderMargin(messages, m, i, user.id),
                            marginTop: isSameUser(messages, m, i, user.id) ? 3 : 10,
                            borderRadius: "20px",
                            padding: "5px 15px",
                            maxWidth: "75%",
                        }}
                        >
                            {m.content}
                        </span>
                    </div>
                ))
            }
        </ScrollableFeed>
    );
};

export default ScrollableChat;
