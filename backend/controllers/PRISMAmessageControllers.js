const asyncHandler = require("express-async-handler");
const prismaService = require("../prismaService");
const prisma = prismaService.getClient();

//@description     Get all Messages
//@route           GET /api/message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: { chatId: parseInt(req.params.chatId, 10) },
            include: {
                sender: {
                    select: {
                        id: true,//VIMP
                        name: true,
                        pic: true,
                        email: true,
                    },
                },
                chat: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.json(messages);
    } catch (error) {
        console.log(error);
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
        senderId: req.user.id,
        content: content,
        chatId: chatId,
    };

    try {
        let message = await prisma.message.create({
            data: newMessage,
        });

        await prisma.chat.update({
            where: { id: req.body.chatId },
            data: { latestMessageId: message.id },
        });

        message = await prisma.message.findUnique({
            where: { id: message.id },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        pic: true,
                    },
                },
                chat: {
                    include: {
                        groupAdmin: {
                            select: {
                                id: true,
                                name: true,
                                pic: true,
                                email: true,
                            },
                        },
                        latestMessage: {
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        name: true,
                                        pic: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                        users: {
                            select: {
                                id: true,
                                name: true,
                                pic: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

module.exports = { allMessages, sendMessage };