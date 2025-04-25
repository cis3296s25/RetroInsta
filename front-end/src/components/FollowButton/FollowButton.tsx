import { useState, useEffect } from "react";
import { User } from '../../models/User';
import { toggleFollowUser } from "../../api/users";
import './FollowButton.css';

interface FollowButtonProps {
  appUser: User | null;
  targetUserID: string | undefined;
  onUserUpdate?: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  appUser,
  targetUserID,
  onUserUpdate
}) => {
  if (!appUser || !targetUserID || appUser._id === targetUserID) return null;

  const [isFollowing, setIsFollowing] = useState(() =>
     appUser.followingUserIDs.includes(targetUserID)
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
     console.log(`[FollowButton ${targetUserID}] useEffect syncing with appUser prop. Is following? ${appUser.followingUserIDs.includes(targetUserID)}`);
     setIsFollowing(appUser.followingUserIDs.includes(targetUserID));
  }, [appUser, targetUserID]);

  const handleFollowClick = async () => {
    if (isLoading || !appUser?._id) return;

    setIsLoading(true);
    const originalState = isFollowing;
    setIsFollowing(!originalState);

    try {
      await toggleFollowUser(appUser._id, targetUserID);
      window.dispatchEvent(new Event("follow-update"));
      console.log(`[FollowButton ${targetUserID}] Dispatched follow-update event.`);
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