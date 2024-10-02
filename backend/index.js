const express = require("express");
const cors = require('cors');
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();
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
if (process.env.NODE_ENV === 'production') {
    app.use(express.static( 'public/build' ));
    console.log(__dirname);
    console.log(path.join(__dirname, 'public', 'build', 'index.html'));
    app.get('*', (req, res) => {
        console.log(req.url);
        res.sendFile(path.join(__dirname, 'public', 'build', 'index.html')); // relative path
    });
}
// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);


const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CLIENT_URL,
    // credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      socket.broadcast.in(user._id).emit("messageReceived", newMessageReceived);
    });
  });

  socket.on("groupModified", (modifiedGrpUsers) => {
    modifiedGrpUsers.forEach((user) => {
      socket.broadcast.in(user._id).emit("refreshGrps");
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });
});
