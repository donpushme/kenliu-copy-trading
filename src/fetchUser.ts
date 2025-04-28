import axios from "axios"
import dotenv from "dotenv";

dotenv.config()



export const FetchUser = async (telegramId : number) => {

    const apiConfigSolClaim = {
        headers: {
            Authorization: process.env.AUTH_TOKEN_SOLCLAIM,
            "Content-Type": "application/json",
        },
    }

    try {
        const { data } = await axios.get(
            `${process.env.API_URL}:${process.env.API_CODE_USER_INFO}/telegram_user/${telegramId}/app`,
            apiConfigSolClaim
        );
        return data;
    } catch (error) {
        console.log(error)
        return []
    }
}