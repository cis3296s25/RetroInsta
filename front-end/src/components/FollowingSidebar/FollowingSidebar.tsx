import { useEffect, useState } from 'react';
import { User } from '../../models/User';
import { getUserById, toggleFollowUser } from '../../api/users';
import { Link } from 'react-router-dom';
import './FollowingSidebar.css';

interface FollowingSidebarProps {
  currentUser: User;
  userCache?: React.MutableRefObject<Record<string, User>>;
  onUserUpdate?: () => void;
}

const FollowingSidebar: React.FC<FollowingSidebarProps> = ({
  currentUser,
  userCache,
  onUserUpdate
}) => {
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);

  const fetchFollowingUsers = async () => {
    const fetchedUsers: User[] = [];

    for (const userId of currentUser.followingUserIDs) {
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
  };


  useEffect(() => {
    fetchFollowingUsers();
  }, [currentUser._id, currentUser.followingUserIDs.join(",")]);

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
                    onUserUpdate?.();
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
