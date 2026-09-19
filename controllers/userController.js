import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const buildProfilePhotoUrl = (fullName, gender) => {
    const safeName = encodeURIComponent(fullName || "User");
    const accent = gender === "female" ? "f472b6" : "38bdf8";
    return `https://ui-avatars.com/api/?name=${safeName}&background=${accent}&color=ffffff&rounded=true&bold=true`;
};

export const register = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, gender } = req.body;
        if (!fullName || !username || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Password do not match" });
        }
        const user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: "Username is already exixt use another Username" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const profilePhoto = buildProfilePhotoUrl(fullName, gender);

        await User.create({
            fullName,
            username,
            password: hashedPassword,
            profilePhoto,
            gender
        });
        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to register user." });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect username or password",
                success: false
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect username or password",
                success: false
            });
        }
        const tokenData = { userId: user._id };
        const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
        return res.status(200).cookie("token", token, {
            maxAge: 1 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        }).json({
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            profilePhoto: user.profilePhoto
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to log in." });
    }
};

export const logout = (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "logged out successfully."
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to log out." });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.Id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found." });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to load the current user." });
    }
};

export const getOtherUsers = async (req, res) => {
    try {
        const loggedInUserId = req.Id;
        const otherUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        return res.status(200).json(otherUsers);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to load users." });
    }
};

export const updateProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Profile photo is required." });
        }

        const user = await User.findById(req.Id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        user.profilePhoto = imageUrl;
        await user.save();

        return res.status(200).json({
            profilePhoto: imageUrl,
            message: "Profile photo updated successfully.",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to update profile photo." });
    }
};