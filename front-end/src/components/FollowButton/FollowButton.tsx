import { useState, useEffect } from "react";
import { User } from '../../models/User';
import { toggleFollowUser } from "../../api/users";
import './FollowButton.css';

interface FollowButtonProps {
  appUser: User | null;
  targetUserID: string | undefined;
  onFollowToggleSuccess?: () => void;
  onUserUpdate?: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  appUser,
  targetUserID,
  onFollowToggleSuccess,
  onUserUpdate
}) => {
  if (!appUser || !targetUserID || appUser._id === targetUserID) return null;

  const [isFollowing, setIsFollowing] = useState(
    appUser.followingUserIDs.includes(targetUserID)
  );
  const [isLoading, setIsLoading] = useState(false);

  // 🔁 Sync when appUser or targetUserID changes
  useEffect(() => {
    setIsFollowing(appUser.followingUserIDs.includes(targetUserID));
  }, [appUser, targetUserID]);

  const handleFollowClick = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const originalState = isFollowing;
    setIsFollowing(!originalState); 

    try {
      await toggleFollowUser(appUser._id, targetUserID);
      onFollowToggleSuccess?.();
      onUserUpdate?.(); 
    } catch (error) {
      console.error("Follow/unfollow failed:", error);
      alert("Something went wrong. Please try again.");
      setIsFollowing(originalState); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`follow-button ${isFollowing ? "following" : ""}`}
      onClick={handleFollowClick}
      disabled={isLoading}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
};

export default FollowButton;
