import { useState } from "react";
import "./PostComponent.css";
import { DisplayPost } from "../../models/Post";
import { User } from "../../models/User";
import { toggleLikePost } from "../../api/posts";
import CommentSection from "../CommentSection/CommentSection";

interface PostComponentProps {
  post: DisplayPost;
  appUser: User | null;
  userCache?: React.MutableRefObject<Record<string, User>>;
  onUserUpdate?: () => void;
}

const PostComponent: React.FC<PostComponentProps> = ({
  post,
  appUser,
  userCache,
  onUserUpdate
}) => {

  const { author, imagePath, description, likes: initialLikes, createdAt } = post;
  const username = author?.username || "Unknown User";
  const profilePicPath = author?.profilePicPath;

  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(
    appUser?.likedPostIDs.includes(post._id)
  );

  const timestamp = createdAt
    ? new Date(createdAt).toLocaleString()
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
          {profilePicPath ? (
            <img className="avatar" src={profilePicPath} alt={`${username}'s avatar`} />
          ) : (
            <div className="avatar-placeholder">👤</div>
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

          <CommentSection
            postID={post._id}
            currentUser={appUser}
            userCache={userCache || { current: {} }}
            imagePath={imagePath}
          />
          <div className="timestamp">{timestamp}</div>
        </div>
      </div>
    </div>
  );
};

export default PostComponent;
