import { useState, useEffect } from "react";
import { User } from '../../models/User';
import { toggleFollowUser, getUserById } from "../../api/users";
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

  useEffect(() => {
    setIsFollowing(appUser.followingUserIDs.includes(targetUserID));
  }, [appUser, targetUserID]);

  useEffect(() => {
    const handleFollowChange = async () => {
      try {
        const refreshedUser = await getUserById(appUser._id);
        setIsFollowing(refreshedUser.followingUserIDs.includes(targetUserID));
      } catch (err) {
        console.error("Failed to refresh follow state:", err);
      }
    };

    window.addEventListener("follow-update", handleFollowChange);
    return () => window.removeEventListener("follow-update", handleFollowChange);
  }, [appUser._id, targetUserID]);

  const handleFollowClick = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const originalState = isFollowing;
    setIsFollowing(!originalState);

    try {
      await toggleFollowUser(appUser._id, targetUserID);

      const updatedUser = await getUserById(appUser._id);
      setIsFollowing(updatedUser.followingUserIDs.includes(targetUserID));

      window.dispatchEvent(new Event("follow-update"));

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
