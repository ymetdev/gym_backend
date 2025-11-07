import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import packagesRoute from "./routes/packageRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/packages", packagesRoute);
app.use("/api/members", memberRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/payments", paymentRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
