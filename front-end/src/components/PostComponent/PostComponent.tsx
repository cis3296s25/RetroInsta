import React, { useEffect, useRef, useState } from "react";
import "./PostComponent.css";
import { DisplayPost, AddCommentPayload, Comment } from "../../models/Post";
import { addComment, getCommentsByPostId } from "../../api/comments";
import { getUserById } from "../../api/users";
import { followUser } from '../../api/users';
import { User } from "../../models/User";
import CommentSection from "../CommentSection/CommentSection";

interface PostComponentProps {
  post: DisplayPost;
  appUser: User | null;
}

const PostComponent: React.FC<PostComponentProps> = ({ post, appUser, userCache }) => {
  const { author, imagePath, description, likes: initialLikes = 0, createdAt } = post;
  const username = author?.username || "Unknown User";
  const profilePicPath = author?.profilePicPath;
  const currentUser = appUser;
  const currentUserId = appUser?._id || "notLoggedIn";

  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);

  // Format the timestamp
  const timestamp = createdAt
      ? new Date(createdAt).toLocaleString() // Simple formatting
      : 'Timestamp unavailable';

  const handleLike = () => {
    setLikes((prevLikes) => (isLiked ? prevLikes - 1 : prevLikes + 1));
    setIsLiked(!isLiked);
  };

  return (
    <div className="post">
      <div className="post-header">
        {profilePicPath ? (
            <img className="avatar" src={profilePicPath} alt={`${username}'s avatar`} />
          ) : (
            <div className="avatar-placeholder">👤</div> // Placeholder if no pic
          )}
          <span className="username">{username}</span>
          <button
            onClick={handleFollowClick}
            style={{
              marginLeft: "auto",
              backgroundColor: "black",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Follow
          </button>
      </div>

      {imagePath ? (
        <img className="post-image" src={imagePath} alt={`Post by ${username}`} />
      ) : (
        <div className="image-placeholder">📷 No Image</div>
      )}

      <div className="post-content">
        <p className="post-description">{description || ''}</p>

        {/* Like & Comment Bar */}
        <div className="post-actions">
          <div className="like-section">
            <button
              className={`like-button ${isLiked ? "liked" : ""}`}
              onClick={handleLike}
              aria-label="Like post"
            >
              ❤️
            </button>
            <span className="like-count">{likes}</span>
          </div>

          {/* Comment section */}
          <CommentSection
            postID={post._id}
            currentUser={currentUser}
            userCache={userCache}
            imagePath={imagePath}
          />
        </div>
        <div className="timestamp">{timestamp}</div>
      </div>
    </div>
  );
};

export default PostComponent;
