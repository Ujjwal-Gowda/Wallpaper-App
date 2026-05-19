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
import { Comment } from "./src/models/comment.js";
import { sendNotificationEmail } from "./src/utils/notifications.js";
import authRouter from "./src/routes/auth.js";
import imagesRouter from "./src/routes/images.js";
import imageRoute from "./src/routes/external.js";
import profileRoute from "./src/routes/profile.js";
import commentsRouter from "./src/routes/comments.js";

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;
  try {
    await ConnectDB(process.env.MONGO_URL);
    isConnected = true;
  } catch (error) {
    console.error(" Database connection failed:", error.message);
  }
};

app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      await connectToDatabase();
    } catch (error) {
      if (req.path.startsWith("/api/") && !req.path.includes("/health")) {
        return res
          .status(503)
          .json({ message: "Database temporarily unavailable", retry: true });
      }
    }
  }
  next();
});

// all available API Routes
app.use("/api/images", imagesRouter);
app.use("/api/auth", authRouter);
app.use("/api/external", imageRoute);
app.use("/api/profile", profileRoute);
app.use("/api/comments", commentsRouter);

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
      comments: "/api/comments/:imageId",
      health: "/health",
    },
  });
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Wallpaper App Backend API",
    health: "/health",
    api: "/api",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(err.status || 500).json({ message: "Internal server error" });
  } else {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Server error", stack: err.stack });
  }
});

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("register_user", (userId) => {
    if (!userId) return;
    socket.userId = userId;
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    console.log(`User ${userId} registered socket ${socket.id}`);
  });

  // public comments
  socket.on("join_comments", (imageId) => {
    socket.join(`comments_${imageId}`);
    console.log(`Socket ${socket.id} joined comments room ${imageId}`);

    Comment.find({ imageId })
      .sort({ createdAt: 1 })
      .populate("sender", "name email")
      .then((comments) => {
        socket.emit("comments_history", comments);
      })
      .catch((err) => console.error("Error fetching comments history:", err));
  });

  socket.on("send_comment", async (data) => {
    const { imageId, senderId, text, tempId, parentCommentId } = data;

    try {
      const commentData = { imageId, sender: senderId, text };
      if (parentCommentId) {
        commentData.parentComment = parentCommentId;
      }
      
      const comment = await Comment.create(commentData);
      const populatedComment = await comment.populate("sender", "name email");

      const commentObj = populatedComment.toObject();
      commentObj.tempId = tempId;

      io.to(`comments_${imageId}`).emit("receive_comment", commentObj);
    } catch (err) {
      console.error("Error saving comment:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.userId) {
      const sockets = userSockets.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(socket.userId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(` Health check: http://localhost:${PORT}/health`);

  connectToDatabase().catch((err) => {
    console.error("Initial database connection failed:", err.message);
  });
});

export default app;
