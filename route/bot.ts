import { Router } from "express";
import { setting, startBot, stopBot } from "../controller/bot.controller";

const router: Router = Router();

router.get("/status");
router.get("/start", startBot);
router.get("/stop", stopBot);
router.post("/setting", setting);

export default router;
