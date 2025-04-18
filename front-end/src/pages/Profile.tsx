import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User } from '../models/User';
import { BackendPost, DisplayPost } from '../models/Post';
import { getUserById } from '../api/users';
import { getAllPosts } from '../api/posts';
import PostFeed from '../components/PostFeed/PostFeed';
import './Profile.css';

interface ProfileProps {
  userCache: Record<string, User>;
}

const Profile: React.FC<ProfileProps> = ({ userCache }) => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        if (!userId) {
          setError('No user ID provided');
          return;
        }

        const [userData, allPosts] = await Promise.all([
          getUserById(userId),
          getAllPosts()
        ]);

        setUser(userData);
        
        // Convert BackendPost to DisplayPost
        const userPosts: DisplayPost[] = allPosts
          .filter(post => post.authorID === userId)
          .map(post => {
            const { authorID, ...rest } = post;
            return {
              ...rest,
              author: userData
            };
          });
        
        setPosts(userPosts);
      } catch (err) {
        setError('Failed to load profile data');
        console.error('Error fetching profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (loading) {
    return <div className="profile-container">Loading profile...</div>;
  }

  if (error) {
    return <div className="profile-container">{error}</div>;
  }

  if (!user) {
    return <div className="profile-container">User not found</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-picture">
          <img 
            src={user.profilePicPath} 
            alt={`${user.username}'s profile`} 
            className="profile-avatar"
          />
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{user.username}</h1>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat">
              <span className="stat-value">{user.postIDs?.length || 0}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-posts">
        <h2>Posts</h2>
        {posts.length > 0 ? (
          <PostFeed posts={posts} appUser={user} userCache={userCache} />
        ) : (
          <p className="no-posts">No posts yet</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
