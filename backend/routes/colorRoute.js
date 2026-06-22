import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  listColorsForSelect,
  adminListColors,
  adminAddColor,
  adminUpdateColor,
  adminRemoveColor
} from "../controllers/colorController.js";

const colorRouter = express.Router();

colorRouter.get("/list", listColorsForSelect);
colorRouter.get("/admin/list", adminAuth, adminListColors);
colorRouter.post("/admin/add", adminAuth, adminAddColor);
colorRouter.post("/admin/update", adminAuth, adminUpdateColor);
colorRouter.post("/admin/remove", adminAuth, adminRemoveColor);

export default colorRouter;
