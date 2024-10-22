const express = require("express");
const cors = require('cors');
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const http = require('http');
// const Redis = require("ioredis");
// const { createAdapter } = require("@socket.io/redis-streams-adapter");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
// const morgan = require("morgan");

dotenv.config();
connectDB();
const app = express();
const server = http.createServer(app);

// Use morgan to log HTTP requests
// app.use(morgan('combined'));

// app.use(cors({credentials: true, origin: process.env.CLIENT_URL}));
app.use(cors({origin: process.env.CLIENT_URL}));

app.use(express.json()); // to accept json data

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

console.log(process.env.NODE_ENV);

// let redisClient = new Redis(process.env.REDIS_URL);
if (process.env.NODE_ENV === 'production') {
    app.use(express.static( 'public/build' ));
    console.log(__dirname);
    console.log(path.join(__dirname, 'public', 'build', 'index.html'));
    app.get('*', (req, res) => {
        console.log(req.url);
        res.sendFile(path.join(__dirname, 'public', 'build', 'index.html')); // relative path
    });
    // redisClient = new Redis(process.env.REDIS_URL);
} else {
    // redisClient = new Redis({
    //     host: "localhost",
    //     port: 6379,
    // });
}

// Test route to check Redis connection
// app.get("/test-redis", async (req, res) => {
//     try {
//         await redisClient.set("test-key", "test-value");
//         const value = await redisClient.get("test-key");
//         res.json({ success: true, value });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
// const args = process.argv.slice(2);
// const PORT = args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : process.env.PORT || 8000

server.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = new Server(server, {
//   adapter: createAdapter(redisClient),
  pingTimeout: 60000,
  cors: {
    origin: process.env.CLIENT_URL,
    // credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);
  socket.on("setup", (userData) => {
    socket.join(userData.id);
    socket.emit("connected");
  });

  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      socket.broadcast.in(user.id).emit("messageReceived", newMessageReceived);
    });
  });

  socket.on("groupModified", (modifiedGrpUsers) => {
    modifiedGrpUsers.forEach((user) => {
      socket.broadcast.in(user.id).emit("refreshGrps");
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData.id);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });
});
