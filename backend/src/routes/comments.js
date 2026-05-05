import express from "express";
import { Comment } from "../models/comment.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// fetches the comments for an image
router.get("/:imageId", async (req, res) => {
  try {
    const comments = await Comment.find({ imageId: req.params.imageId })
      .sort({ createdAt: 1 })
      .populate("sender", "name email");
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comments" });
  }
});

// posting  a comment
router.post("/:imageId", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.create({
      imageId: req.params.imageId,
      sender: req.user.id,
      text,
    });
    const populatedComment = await comment.populate("sender", "name email");
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: "Error posting comment" });
  }
});

// delete a comment
router.delete("/:commentId", requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (String(comment.sender) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting comment" });
  }
});

export default router;
