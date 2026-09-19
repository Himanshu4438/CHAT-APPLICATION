import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";

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

export const sendMessage = async (req, res) => {
    try {
        const senderId = req.Id;
        const receiverId = req.params.Id;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message cannot be empty." });
        }

        const conversation = await getOrCreateConversation(senderId, receiverId);
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: message.trim(),
            status: "sent",
        });

        conversation.messages.push(newMessage._id);
        await conversation.save();

        return res.status(201).json({
            message: "Message sent successfully.",
            data: newMessage,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to send message." });
    }
};

export const getMessage = async (req, res) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.Id;
        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            return res.status(200).json([]);
        }

        await conversation.populate({
            path: "messages",
            options: { sort: { createdAt: 1 } },
        });

        const messages = conversation.messages.map((item) => {
            if (String(item.receiverId) === String(senderId) && item.status !== "read") {
                item.status = "read";
                return item;
            }
            return item;
        });

        await Promise.all(
            messages
                .filter((item) => String(item.receiverId) === String(senderId) && item.status === "read")
                .map(async (item) => {
                    await Message.findByIdAndUpdate(item._id, { status: "read" });
                })
        );

        return res.status(200).json(messages);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to load messages." });
    }
};

export const getUnreadCounts = async (req, res) => {
    try {
        const userId = req.Id;
        const conversations = await Conversation.find({
            participants: userId,
        }).populate({
            path: "messages",
            options: { sort: { createdAt: 1 } },
        });

        const unreadMap = {};

        for (const conversation of conversations) {
            const otherUser = conversation.participants.find((participant) => String(participant) !== String(userId));
            if (!otherUser) continue;

            const unreadCount = conversation.messages.filter((message) => {
                return String(message.receiverId) === String(userId) && message.status !== "read";
            }).length;

            unreadMap[String(otherUser)] = unreadCount;
        }

        return res.status(200).json(unreadMap);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to load unread counts." });
    }
};

export const editMessage = async (req, res) => {
    try {
        const userId = req.Id;
        const messageId = req.params.id;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message cannot be empty." });
        }

        const foundMessage = await Message.findById(messageId);
        if (!foundMessage) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (String(foundMessage.senderId) !== String(userId)) {
            return res.status(403).json({ message: "You can only edit your own messages." });
        }

        foundMessage.message = message.trim();
        await foundMessage.save();

        return res.status(200).json({ message: "Message updated successfully.", data: foundMessage });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to edit message." });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const userId = req.Id;
        const messageId = req.params.id;

        const foundMessage = await Message.findById(messageId);
        if (!foundMessage) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (String(foundMessage.senderId) !== String(userId)) {
            return res.status(403).json({ message: "You can only delete your own messages." });
        }

        await Message.findByIdAndDelete(messageId);

        await Conversation.updateOne(
            { participants: { $all: [foundMessage.senderId, foundMessage.receiverId] } },
            { $pull: { messages: messageId } }
        );

        return res.status(200).json({ message: "Message deleted successfully." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to delete message." });
    }
};