import { useState } from "react";
import { User } from '../../models/User'
import { toggleFollowUser } from "../../api/users";
import './FollowButton.css'

interface FollowButtonProps {
    appUser: User | null;
    targetUserID: string | undefined;
    onFollowToggleSuccess?: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
    appUser,
    targetUserID,
    onFollowToggleSuccess
}) => {
    // Don't show button if not logged in, no target, or it's the user themselves
    if (!appUser || !targetUserID || appUser._id === targetUserID) {
        return null; 
    }

    const [isFollowing, setIsFollowing] = useState(
        // initially set to whether targetUser is in appUser's following list
        appUser?.followingUserIDs?.includes(targetUserID ?? '') || false
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleFollowClick = async() => {
        if (isLoading) return; // prevent multiple clicks

        setIsLoading(true);

        const originalFollowState =  isFollowing

        // optimistic ui update
        setIsFollowing(!originalFollowState);

        try {
            await toggleFollowUser(appUser._id, targetUserID);

            onFollowToggleSuccess?.();
        } catch (error) {
            console.error("Follow action failed:", error);
            alert("Failed to update follow status. Please try again");
            setIsFollowing(originalFollowState); // restore original
        } finally {
            setIsLoading(false);
        }
    };

    const buttonClasses = [
        'follow-button',
        isFollowing ? 'following' : '',
        isLoading ? 'loading' : ''
    ].filter(Boolean).join(' ');

    return (
        <button
            className={buttonClasses}
            onClick={handleFollowClick}
            disabled={isLoading}
            style={{
                marginLeft: "auto"
            }}
        >
            {isFollowing ? "Following" : "Follow"}
        </button>
    );
};

export default FollowButton;
