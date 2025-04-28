import express, { Request, Response } from "express";
import  botRouter from "./route/bot"

import dotenv from "dotenv"
dotenv.config()


const app = express();
const port = process.env.PORT || 5000;

import bodyParser from "body-parser";

app.use(bodyParser.json());

// Routers
app. use("/bot", botRouter);


const start = async () => {
    try {
        // only connect to server if successfully-connected to DB
        app.listen(port, () =>
            console.log(`Server is listening on http://localhost:${port}`)
        );
    } catch (error) {
        console.log(error);
    }
};
start();


