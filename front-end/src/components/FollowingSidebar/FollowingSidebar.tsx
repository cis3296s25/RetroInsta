// components/FollowingSidebar/FollowingSidebar.tsx
import { useEffect, useState } from 'react';
import { User } from '../../models/User';
import { getUserById } from '../../api/users';
import { Link } from 'react-router-dom';
import './FollowingSidebar.css';

interface FollowingSidebarProps {
  currentUser: User;
  userCache?: React.MutableRefObject<Record<string, User>>;
}

const FollowingSidebar: React.FC<FollowingSidebarProps> = ({ currentUser, userCache }) => {
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchFollowingUsers = async () => {
      const fetchedUsers: User[] = [];

      for (const userId of currentUser.followingUserIDs) {
        if (userCache?.current[userId]) {
          fetchedUsers.push(userCache.current[userId]);
        } else {
          try {
            const user = await getUserById(userId);
            userCache?.current && (userCache.current[userId] = user);
            fetchedUsers.push(user);
          } catch (error) {
            console.warn(`Failed to fetch user ${userId}`);
          }
        }
      }

      setFollowingUsers(fetchedUsers);
    };

    fetchFollowingUsers();
  }, [currentUser, userCache]);

  if (followingUsers.length === 0) {
    return <div className="following-sidebar">Not following anyone yet.</div>;
  }

  return (
    <div className="following-sidebar">
      <h3>Following</h3>
      <ul>
        {followingUsers.map(user => (
          <li key={user._id}>
            <Link to={`/profile/${user._id}`} className="following-user-link">
              <img src={user.profilePicPath} alt={user.username} className="following-avatar" />
              <span>{user.username}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FollowingSidebar;
