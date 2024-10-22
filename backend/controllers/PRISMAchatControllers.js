const asyncHandler = require("express-async-handler");
const prismaService = require("../prismaService");
const prisma = prismaService.getClient();

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.log("UserId param not sent with request");
        return res.sendStatus(400);
    }

    let isChat = await prisma.chat.findMany({
        where: {
            isGroupChat: false,
            users: {
                some: {
                    id: req.user.id,
                },
                some: {
                    id: userId,
                },
            },
        },
        include: {
            users: true,
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
        },
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        const chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: {
                connect: [{ id: req.user.id }, { id: userId }],
            },
        };

        try {
            const createdChat = await prisma.chat.create({
                data: chatData,
                include: {
                    users: true,
                },
            });
            res.status(200).json(createdChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
});

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
    try {
        const chats = await prisma.chat.findMany({
            where: {
                users: {
                    some: {
                        id: req.user.id,
                    },
                },
            },
            include: {
                users: true,
                groupAdmin: true,
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
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        res.status(200).send(chats);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please fill all the fields" });
    }

    const users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send("More than 2 users are required to form a group chat");
    }

    users.push(req.user.id);

    try {
        const groupChat = await prisma.chat.create({
            data: {
                chatName: req.body.name,
                isGroupChat: true,
                groupAdmin: {
                    connect: { id: req.user.id },
                },
                users: {
                    connect: users.map(userId => ({ id: userId })),
                },
            },
            include: {
                users: true,
                groupAdmin: true,
            },
        });

        res.status(200).json(groupChat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    try {
        const updatedChat = await prisma.chat.update({
            where: { id: chatId },
            data: { chatName: chatName },
            include: {
                users: true,
                groupAdmin: true,
            },
        });

        if (!updatedChat) {
            res.status(404);
            throw new Error("Chat Not Found");
        } else {
            res.json(updatedChat);
        }
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    const chat = await prisma.chat.findUnique({
        where: { id: parseInt(chatId, 10) },
        include: {
            users: true
        },
    });

    if (!chat) {
        res.status(404);
        throw new Error("Chat Not Found");
    }

    // Check if the user being removed is the group admin
    const isAdminBeingRemoved = chat.groupAdminId === parseInt(userId, 10);
    
    // Remove the user from the chat's users array
    chat.users = chat.users.filter(user => user.id !== parseInt(userId, 10));

    if (chat.users.length === 0) {
        // Remove this particular chat if no users are left
        await prisma.chat.delete({
            where: { id: parseInt(chatId, 10) },
        });

        //messages of the chat are automatically deleted due to onDelete: Cascade

        res.json({ message: "Chat has been deleted as no users are left." });
        return;
    }

    // If the admin was removed, assign a new admin
    if (isAdminBeingRemoved) {
        const newAdmin = chat.users[0]; // Select the first user as the new admin
        chat.groupAdminId = newAdmin.id;
    }

    // Update the chat with the new users array and groupAdminId
    const updatedChat = await prisma.chat.update({
        where: { id: parseInt(chatId, 10) },
        data: {
            users: {
                set: chat.users.map(user => ({ id: user.id })),
            },
            groupAdminId: chat.groupAdminId,
        },
        include: {
            groupAdmin: true,
            users: true,
        },
    });

    res.json(updatedChat);
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    // Find the chat by chatId and include users and groupAdmin
    const chat = await prisma.chat.findUnique({
        where: { id: parseInt(chatId, 10) },
        include: {
            users: true,
        },
    });

    if (!chat) {
        res.status(404);
        throw new Error("Chat Not Found");
    }

    // Add the user to the chat's users array
    const updatedChat = await prisma.chat.update({
        where: { id: parseInt(chatId, 10) },
        data: {
            users: {
                connect: { id: parseInt(userId, 10) },
            },
        },
        include: {
            users: true,
            groupAdmin: true,
        },
    });

    res.json(updatedChat);
});


module.exports = { accessChat, fetchChats, createGroupChat, renameGroup, removeFromGroup, addToGroup };