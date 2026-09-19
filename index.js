import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/database.js";
import userRoute from "./routes/userRoute.js";
import messageRoute from "./routes/messageRoute.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Message } from "./models/messageModel.js";
import { Conversation } from "./models/conversationModel.js";

dotenv.config({});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendBuildPath = path.resolve(__dirname, "../frontend/build");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
let currentPort = PORT;
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true,
    },
});

const connectedUsers = new Map();
const onlineUsers = new Set();

//middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const corsOption = {
    origin: "http://localhost:3000",
    credentials: true,
};
app.use(cors(corsOption));

//routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/message", messageRoute);
app.use("/uploads", express.static("uploads"));
app.use(express.static(frontendBuildPath));

app.get(/^(?!\/api\/|\/uploads(?:\/|$)|\/socket\.io(?:\/|$)).*/, (req, res, next) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"), (error) => {
        if (error) next();
    });
});

const getOrCreateConversation = async (senderId, receiverId) => {
    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [senderId, receiverId],
        });
    }

    return conversation;
};

io.on("connection", (socket) => {
    socket.on("join", (userId) => {
        if (!userId) return;
        connectedUsers.set(userId, socket.id);
        onlineUsers.add(userId);
        socket.join(userId);
        io.emit("onlineUsers", Array.from(onlineUsers));
        socket.emit("connected", { userId });
    });

    socket.on("sendMessage", async ({ receiverId, message }) => {
        try {
            if (!receiverId || !message?.trim()) return;

            const senderId = socket.handshake.query?.userId;
            if (!senderId) return;

            const conversation = await getOrCreateConversation(senderId, receiverId);
            const newMessage = await Message.create({
                senderId,
                receiverId,
                message: message.trim(),
                status: onlineUsers.has(receiverId) ? "delivered" : "sent",
            });

            conversation.messages.push(newMessage._id);
            await conversation.save();

            const payload = {
                _id: newMessage._id,
                senderId,
                receiverId,
                message: newMessage.message,
                status: newMessage.status,
                createdAt: newMessage.createdAt,
            };

            io.to(senderId).emit("newMessage", payload);
            io.to(receiverId).emit("newMessage", payload);
        } catch (error) {
            console.error("Socket sendMessage error:", error);
        }
    });

    socket.on("markRead", async ({ conversationUserId }) => {
        try {
            const readerId = socket.handshake.query?.userId;
            if (!readerId || !conversationUserId) return;

            const unreadMessages = await Message.find({
                senderId: conversationUserId,
                receiverId: readerId,
                status: { $ne: "read" },
            }).select("_id senderId receiverId");

            if (!unreadMessages.length) return;

            await Message.updateMany(
                { _id: { $in: unreadMessages.map((item) => item._id) } },
                { $set: { status: "read" } }
            );

            io.to(conversationUserId).emit("messageStatus", {
                messageIds: unreadMessages.map((item) => String(item._id)),
                status: "read",
            });
            socket.emit("messageStatus", {
                messageIds: unreadMessages.map((item) => String(item._id)),
                status: "read",
            });
        } catch (error) {
            console.error("Socket markRead error:", error);
        }
    });

    socket.on("typing", ({ receiverId, isTyping }) => {
        if (!receiverId || !socket.handshake.query?.userId) return;
        const senderId = socket.handshake.query.userId;
        io.to(receiverId).emit("typing", {
            userId: senderId,
            isTyping,
        });
    });

    socket.on("disconnect", () => {
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                onlineUsers.delete(userId);
            }
        }
        io.emit("onlineUsers", Array.from(onlineUsers));
    });
});

const startServer = (portToUse = currentPort) => {
    currentPort = portToUse;
    server.listen(portToUse, () => {
        connectDB();
        console.log(`Server listen at port ${portToUse}`);
    });
};

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        const nextPort = currentPort + 1;
        console.warn(`Port ${currentPort} is already in use. Trying port ${nextPort}...`);
        if (currentPort === PORT) {
            startServer(nextPort);
            return;
        }
        console.error(`Port ${currentPort} is also unavailable. Please free the port and restart.`);
        process.exit(1);
        return;
    }

    console.error("Server error:", error);
    process.exit(1);
});

startServer();