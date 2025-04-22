import React, { useEffect, useState } from "react";
import { Comment, AddCommentPayload } from "../../models/Post";
import { getCommentsByPostId, addComment } from "../../api/comments";
import { getUserById } from "../../api/users";
import { User } from "../../models/User";
import "./CommentSection.css";

interface CommentSectionProps {
  postID: string;
  currentUser: User;
  userCache: React.MutableRefObject<{ [userId: string]: User }>;
  imagePath?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postID,
  currentUser,
  userCache,
  imagePath,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentUsernames, setCommentUsernames] = useState<{ [commentId: string]: string }>({});
  const [comment, setComment] = useState("");
  const [showCommentsPopup, setShowCommentsPopup] = useState(false);

  const getUsername = async (authorID: string) => {
    if (userCache.current[authorID]?.username) {
      return userCache.current[authorID].username;
    }

    try {
      const newUser = await getUserById(authorID);
      userCache.current[authorID] = newUser;
      return newUser.username;
    } catch (err) {
      console.error("Failed to fetch username:", err);
      return "Unknown User";
    }
  };

  const fetchCommentsAndUsernames = async () => {
    try {
      const fetchedComments = await getCommentsByPostId(postID);
      setComments(fetchedComments);

      const newUsernames: { [commentId: string]: string } = {};
      for (const c of fetchedComments) {
        const username = await getUsername(c.authorID);
        newUsernames[c._id] = username;
      }
      setCommentUsernames(newUsernames);
    } catch (error) {
      console.error("Error loading comments or usernames:", error);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleCommentSubmit = async () => {
    try {
      const payload: AddCommentPayload = {
        commentText: comment,
        authorID: currentUser._id,
        postID,
      };

      await addComment(payload);
      setComment("");
      await fetchCommentsAndUsernames();
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("Failed to create comment.");
    }
  };

  // Fetch comments and usernames when the component mounts or when postID changes
  useEffect(() => {
    fetchCommentsAndUsernames();
  }, [postID]);

  return (
    <>
      <div className="comment-section">
        <span
          className="comment-icon"
          role="button"
          aria-label="Comment on post"
          onClick={() => setShowCommentsPopup(true)}
        >
          💬
        </span>
        <span className="comment-count">{comments.length}</span>
      </div>

      {showCommentsPopup && (
        <div className="modal-overlay" onClick={() => setShowCommentsPopup(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {imagePath && (
              <img className="modal-full-image" src={imagePath} alt="Post preview" />
            )}

            <div className="modal-comments-overlay">
              <div className="modal-comments-scroll">
                <h3>Comments</h3>
                {comments.length === 0 ? (
                  <p>No comments yet.</p>
                ) : (
                  comments.map((comment, index) => {
                    const username = commentUsernames[comment._id] || "Loading...";
                    return (
                      <div key={index} className="comment">
                        <a href={`/profile/${comment.authorID}`} className="comment-author">{username}: </a>
                        <span className="comment-text">{comment.commentText}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="modal-comment-input-row">
                <input
                  type="text"
                  className="comment-input"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={handleCommentChange}
                />
                <button
                  className="comment-submit"
                  onClick={handleCommentSubmit}
                  aria-label="Submit comment"
                  disabled={!comment.trim()}
                >
                  Post
                </button>
              </div>
              <button className="close-button" onClick={() => setShowCommentsPopup(false)}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommentSection;
