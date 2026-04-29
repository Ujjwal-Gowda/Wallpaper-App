import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import path from "path";
import { ConnectDB } from "./src/db.js";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { Message } from "./src/models/message.js";
import { Image } from "./src/models/image.js";
import { User } from "./src/models/user.js";
import { sendNotificationEmail } from "./src/utils/notifications.js";
import authRouter from "./src/routes/auth.js";
import imagesRouter from "./src/routes/images.js";
import imageRoute from "./src/routes/external.js";
import profileRoute from "./src/routes/profile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "https://wallpaper-app-frontend.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost:")
    ) {
      return callback(null, true);
    }

    console.log(" CORS blocked origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(
  "/static-images",
  express.static(path.join(__dirname, "public/images")),
);

// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
//   console.log("Origin:", req.headers.origin);
//   next();
// });

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    console.log(" Using existing database connection");
    return;
  }

  try {
    console.log(" Establishing database connection...");
    await ConnectDB(process.env.MONGO_URL);
    isConnected = true;
    console.log(" Database connected successfully");
  } catch (error) {
    console.error(" Database connection failed:", error.message);
    console.log("  Server will continue without database connection");
  }
};

// Database middleware
app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      await connectToDatabase();
    } catch (error) {
      console.error("Database middleware error:", error.message);
      if (req.path.startsWith("/api/") && !req.path.includes("/health")) {
        return res.status(503).json({
          message: "Database temporarily unavailable",
          retry: true,
        });
      }
    }
  }
  next();
});

// API Routes with proper /api prefix
app.use("/api/images", imagesRouter);
app.use("/api/auth", authRouter);
app.use("/api/external", imageRoute);
app.use("/api/profile", profileRoute);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running",
    database: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    cors: "enabled",
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    ok: true,
    message: "Wallpaper App API v1.0",
    database: isConnected ? "connected" : "disconnected",
    endpoints: {
      auth: "/api/auth/login, /api/auth/register, /api/auth/logout",
      images: "/api/images/*",
      external: "/api/external",
      profile: "/api/profile",
      health: "/health",
    },
    cors: "enabled",
  });
});

// Root endpoint for debugging
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Wallpaper App Backend API",
    health: "/health",
    api: "/api",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(err.status || 500).json({
      message: "Internal server error",
    });
  } else {
    res.status(err.status || 500).json({
      message: err.message || "Server error",
      stack: err.stack,
    });
  }
});

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_room", (imageId) => {
    socket.join(imageId);
    console.log(`User ${socket.id} joined room ${imageId}`);
    
    // Send existing messages
    Message.find({ imageId })
      .sort({ createdAt: 1 })
      .populate("sender", "name email")
      .then(messages => {
        socket.emit("chat_history", messages);
      })
      .catch(err => console.error("Error fetching chat history:", err));
  });

  socket.on("send_message", async (data) => {
    const { imageId, senderId, text } = data;
    try {
      const message = await Message.create({
        imageId,
        sender: senderId,
        text
      });
      
      const populatedMessage = await message.populate("sender", "name email");
      io.to(imageId).emit("receive_message", populatedMessage);

      // Notification Logic
      // Check if image is local (uploaded by user)
      if (imageId.length === 24) { // Assuming MongoDB ObjectId length
        const image = await Image.findById(imageId).populate("owner");
        if (image && image.owner && String(image.owner._id) !== String(senderId)) {
          const sender = await User.findById(senderId);
          await sendNotificationEmail(
            image.owner.email,
            image.Title || "Wallpaper",
            sender ? sender.name : "A user"
          );
        }
      }
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server and attempt database connection
httpServer.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` API: http://localhost:${PORT}/api`);

  // Attempt database connection after server starts
  connectToDatabase().catch((err) => {
    console.error("Initial database connection failed:", err.message);
    console.log(" Will retry on first API request...");
  });
});

export default app;

