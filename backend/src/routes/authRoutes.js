import { Router } from "express";
import { currentUser, login, logout, register } from "../controllers/authController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";

const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(currentUser));

export { authRouter };
