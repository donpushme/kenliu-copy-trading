import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { bot } from "../bot";

export const startBot = expressAsyncHandler(
  async (req: Request, res: Response) => {
    bot.start();
    res.status(200).json({ message: "Bot started running" });
  }
);

export const stopBot = expressAsyncHandler(
  async (req: Request, res: Response) => {
    bot.stop();
    res.status(200).json({ message: "The bot has stopped" });
  }
);

export const setting = expressAsyncHandler(
  async (req: Request, res: Response) => {
    console.log("reqest");
    const { settings } = req.body;
    console.log("here");
    bot.updateSettings(settings);
    res.status(200).json({ message: "Bot settings changed" });
  }
);
