# Copy Trading Bot

## Components
- Simple UI
- Express Backend

## How to run the bot
Highly recommed that you run the bot in the VPS for the fast speed and prevention from the external activity

### Setting the express backend
  In the project directory, run the command like follows
  
  `
  yarn
  `
### Create .env file in the directory and copy this data
>  PRIVATE_KEY =
> 
>  RPC_ENDPOINT = https://mainnet.helius-rpc.com/?api-key=
> 
>  RPC_WEBSOCKET_ENDPOINT = wss://mainnet.helius-rpc.com/?api-key=
> 
>  GRPC_ENDPOINT = wss://atlas-mainnet.helius-rpc.com/?api-key=
> 
>  BASE_MINT_ADDRESS = So11111111111111111111111111111111111111112
> 
>  MONGO_URI =
> 
>  IS_JITO = false
> 
>  JITO_FEE = 0.0001
> 
>  BUY_AMOUNT = 0.001
> 
>  PRIORITY_FEE = 5200
> 
>  TARGET_ADDRESS =
>

### Run the backend
`
yarn dev
`

### Setting Up the UI
- Go into the frontend directory
  `cd frontend`
- Run this command
  `npx http-server -p 3000`

### Go to the browser and browe http://localhost:3000

