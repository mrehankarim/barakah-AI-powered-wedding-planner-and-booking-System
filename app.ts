import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/authRoutes";
import packageRouter from "./routes/packageRoutes";
import bookingRouter from "./routes/bookingRoutes";
import reviewRouter from "./routes/reviewRoutes";
import dashboardRouter from "./routes/dashboardRoutes";
import wishlistRouter from "./routes/wishlistRoutes";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
dotenv.config();

app.use(cors({
  origin: "*"
}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb" }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/packages", packageRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/wishlist", wishlistRouter);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Barakah API Server",
  });
});

export default app;
