import express from "express";
import { getMessage, sendMessage, getUnreadCounts, editMessage, deleteMessage } from "../controllers/messageController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
const router = express.Router();

router.route("/send/:Id").post(isAuthenticated, sendMessage);
router.route("/unread").get(isAuthenticated, getUnreadCounts);
router.route("/:id").get(isAuthenticated, getMessage);
router.route("/:id/edit").put(isAuthenticated, editMessage);
router.route("/:id/delete").delete(isAuthenticated, deleteMessage);
export default router;