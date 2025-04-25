import { useEffect, useState } from 'react';
import { User } from '../../models/User';
import { getUserById, toggleFollowUser } from '../../api/users';
import { Link } from 'react-router-dom';
import './FollowingSidebar.css';

interface FollowingSidebarProps {
  currentUser: User;
  userCache?: React.MutableRefObject<Record<string, User>>;
}

const FollowingSidebar: React.FC<FollowingSidebarProps> = ({
  currentUser,
  userCache
}) => {
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);

  const fetchFollowingUsers = async () => {
    try {
      const updatedUser = await getUserById(currentUser._id);
      const followingIDs = updatedUser.followingUserIDs || [];
  
      const fetchedUsers: User[] = [];
      for (const userId of followingIDs) {
        if (userCache?.current[userId]) {
          fetchedUsers.push(userCache.current[userId]);
        } else {
          try {
            const user = await getUserById(userId);
            if (userCache?.current) userCache.current[userId] = user;
            fetchedUsers.push(user);
          } catch (error) {
            console.warn(`Failed to fetch user ${userId}`);
          }
        }
      }
  
      setFollowingUsers(fetchedUsers);
    } catch (err) {
      console.error("Failed to refresh following users:", err);
    }
  };
  

  useEffect(() => {
    fetchFollowingUsers();
  }, [currentUser._id, currentUser.followingUserIDs.join(",")]);

  useEffect(() => {
    const handleFollowChange = () => {
      fetchFollowingUsers();
    };

    window.addEventListener("follow-update", handleFollowChange);
    return () => window.removeEventListener("follow-update", handleFollowChange);
  }, []);

  if (followingUsers.length === 0) {
    return <div className="following-sidebar">Not following anyone yet.</div>;
  }

  return (
    <div className="following-sidebar">
      <h3 className="sidebar-heading">Following</h3>
      <ul className="following-user-list">
        {followingUsers.map(user => (
          <li key={user._id} className="following-user-item">
            <div className="following-user-info">
              <Link to={`/profile/${user._id}`} className="following-user-link">
                <img src={user.profilePicPath} alt={user.username} className="following-avatar" />
                <span className="following-username">{user.username}</span>
              </Link>
              <button
  className="unfollow-button"
  onClick={async () => {
    try {
      await toggleFollowUser(currentUser._id, user._id);

      window.dispatchEvent(new Event("follow-update"));
    } catch (err) {
      console.error('Failed to unfollow user:', err);
      alert('Unfollow failed');
    }
  }}
>
  Unfollow
</button>

            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FollowingSidebar;
