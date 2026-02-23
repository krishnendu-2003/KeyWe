import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { quoteRoutes } from "./routes/quote.js";
import { swapRoutes } from "./routes/swap.js";
import { contractRoutes } from "./routes/contract.js";
import { balanceRoutes } from "./routes/balance.js";
import { propertyRoutes } from "./routes/property.js";
import { depositRoutes } from "./routes/deposit.js";
import { releaseRoutes } from "./routes/release.js";
import { initDatabase } from "./database/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Initialize database
initDatabase()
  .then(() => console.log('✅ Database initialized'))
  .catch(err => console.error('❌ Database initialization failed:', err));

// Routes
app.use("/api/quote", quoteRoutes);
app.use("/api/swap", swapRoutes);
app.use("/api/contract", contractRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/release", releaseRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Horizon: ${process.env.HORIZON_URL}`);
  console.log(`🔗 Soroban RPC: ${process.env.SOROBAN_RPC_URL}`);
});
