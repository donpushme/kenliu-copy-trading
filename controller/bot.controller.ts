import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { bot } from "../bot";
import { getSettings } from "../bot/utils/commonFunc";

export const startBot = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const msg = await bot.start(Number(id));
    res.status(200).json(msg);
  }
);

export const stopBot = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const msg = await bot.stop(Number(id));
    res.status(200).json(msg);
  }
);

export const setting = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const settings = req.body;
    console.log(req.body);
    bot.updateSettings(settings);
    res.status(200).json({ message: "Bot settings changed" });
  }
);

export const fetchSettings = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const settings = getSettings();
    res.status(200).json(settings);
  }
);
