import express from "express";
import {
    register,
    login,
    logout,
    getCurrentUser,
    getOtherUsers,
    updateProfilePhoto,
} from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/me").get(isAuthenticated, getCurrentUser);
router.route("/profile-photo").post(isAuthenticated, upload.single("profilePhoto"), updateProfilePhoto);
router.route("/").get(isAuthenticated, getOtherUsers);

export default router;