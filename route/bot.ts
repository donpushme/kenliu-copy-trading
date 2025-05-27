import { Router } from "express";
import { setting, startBot, stopBot, fetchSettings } from "../controller/bot.controller";

const router: Router = Router();

router.get("/status");
router.get("/start/:id", startBot);
router.get("/stop/:id", stopBot);
router.get("/setting", fetchSettings);
router.post("/setting", setting);

export default router;
