import cookieParser from "cookie-parser"
import express, { Request, Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import authRouter from "./routes/authRoutes"
const app = express()
dotenv.config()


app.use(cors({
    origin: "*"
}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb" }))

app.use("/api/v1/auth", authRouter)
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "This is server of "
    })
})

export default app
