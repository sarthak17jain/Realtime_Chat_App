const asyncHandler = require('express-async-handler');
const generateToken = require('../config/generateToken');
const bcrypt = require("bcryptjs");
const prismaService = require("../prismaService");
const prisma = prismaService.getClient();

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Protected
const allUsers = asyncHandler(async (req, res) => {
    const search = req.query.search;
    const keyword = search
        ? {
              OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
              ],
          }
        : {};

    const users = await prisma.user.findMany({
        where: {
            ...keyword,
            id: { not: req.user.id },
        }
    });

    res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
    let { name, email, password, pic } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please Enter all the Fields');
    }

    if (!pic) {
        pic = 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
    }

    const userExists = await prisma.user.findUnique({
        where: { email },
    });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password,
            pic,
        },
    });

    if (user) {
        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user.id),
        });
    } else {
        res.status(400);
        throw new Error('User not found');
    }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            password: true,
            pic: true
        }
    });

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user.id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid Email or Password');
    }
});

module.exports = { allUsers, registerUser, authUser };