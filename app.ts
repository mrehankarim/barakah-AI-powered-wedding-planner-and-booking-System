import cookieParser from "cookie-parser"
import express, { Request, Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import authRouter from "./routes/authRoutes"
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
const app = express()
dotenv.config()


app.use(cors({
    origin: "*"
}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb" }))


const PORT = process.env.PORT || 3000

const swaggerOptions: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Barakah Wedding Platform API",
            version: "1.0.0",
            description: "Complete API Documentation for Barakah Backend Services",
        },
        servers: [
            {
                url: `http://localhost:${PORT}/api/v1`,
                description: "Development Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter JWT Access Token",
                },
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "accessToken",
                    description: "Access token cookie",
                },
            },
        },
    },
    apis: ["./routes/*.ts", "./routes/*.js", "./controllers/*.ts", "./controllers/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get("/docs.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

app.use("/api/v1/auth", authRouter)
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "Welcome to Barakah Backend API"
    })
})
export default app
