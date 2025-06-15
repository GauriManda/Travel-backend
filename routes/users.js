import express from "express";
import {
  createUser,
  updateUser,
  deleteUser,
  getSingleUser,
  getAllUsers, // Fixed: was getAllUser, now getAllUsers (plural)
} from "../controllers/userController.js";
import { verifyAdmin, verifyUser } from "../utils/verifyToken.js";

const router = express.Router();

// CRUD routes
router.post("/", verifyAdmin, createUser);
router.put("/:id", verifyUser, updateUser);
router.delete("/:id", verifyUser, deleteUser);
router.get("/:id", verifyUser, getSingleUser);
router.get("/", verifyAdmin, getAllUsers); // Fixed: was getAllUser, now getAllUsers

export default router;
