import { useEffect, useRef, useState } from "react";
import "./PostComponent.css";
import { DisplayPost } from "../../models/Post";
import { User } from "../../models/User";
import { toggleLikePost } from "../../api/posts";
import CommentSection from "../CommentSection/CommentSection";
import { Link } from 'react-router-dom'; 

interface PostComponentProps {
  post: DisplayPost;
  appUser: User | null;
  userCache?:React.MutableRefObject<Record<string, User>>;
}

const PostComponent: React.FC<PostComponentProps> = ({ post, appUser, userCache }) => {
  const { author, imagePath, description, likes: initialLikes, createdAt } = post;
  const username = author?.username || "Unknown User";
  const profilePicPath = author?.profilePicPath;

  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(
    appUser?.likedPostIDs.includes(post._id) // initally set to whether user has liked post before
  );

  // Format the timestamp
  const timestamp = createdAt
      ? new Date(createdAt).toLocaleString() // Simple formatting
      : 'Timestamp unavailable';

  const handleLike = async () => {
    if (!appUser) {
      alert("You must be logged in to like a post, stupid.");
      return;
    }

    try {
      await toggleLikePost(post._id, appUser._id);
      setLikes((prevLikes) => (isLiked ? prevLikes - 1 : prevLikes + 1));
      setIsLiked(!isLiked);
      console.log("User liked/unliked post.");
    } catch (error) {
      console.error("Error toggling like:", error);
      alert("Failed to like/unlike post");
    }
  };

  return (
    <div className="post">
        <div className="post-header">
        <a href={`/profile/${author?._id}`} className="avatar-link">
          {/* Post header is a link to author's profile */}
            {profilePicPath ? (
              <img className="avatar" src={profilePicPath} alt={`${username}'s avatar`} />
            ) : (
              <div className="avatar-placeholder">👤</div> // Placeholder if no pic
            )}
          </a>
          <a href={`/profile/${author?._id}`} className="username">
          {username}
          </a>
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
              {isLiked ? "❤️" : "🤍"}
            </button>
            <span className="like-count">{likes}</span>
          </div>

          {/* Comment section */}
          <CommentSection
            postID={post._id}
            currentUser={appUser}
            userCache={userCache || { current: {} }} // Provide a default empty cache
            imagePath={imagePath}
          />
          <div className="timestamp">{timestamp}</div>
        </div>
      </div>
    </div>
  );
};

export default PostComponent;
