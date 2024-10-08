const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

//@description     Get all Messages
//@route           GET /api/message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "name pic email")
            .populate("chat")
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

//@description     Create New Message
//@route           POST /api/message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }

    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
    };

    try {
        let message = await Message.create(newMessage);
        await Chat.findByIdAndUpdate(req.body.chatId, {
            latestMessage: message,
        });

        message = await message.populate("sender", "name pic");
        message = await message.populate({
            path: "chat",
            populate: [
                {
                    path: "groupAdmin",
                    select: "name pic email",
                },
                {
                    path: "latestMessage",
                    populate: {
                        path: "sender",
                        select: "name pic email",
                    },
                }
            ],
        });
        message = await User.populate(message, {
            path: "chat.users",
            select: "name pic email",
        });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

module.exports = { allMessages, sendMessage };
