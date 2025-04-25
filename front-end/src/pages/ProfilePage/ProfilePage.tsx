import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User } from '../../models/User';
import { DisplayPost } from '../../models/Post';
import { getUserById, updateBio } from '../../api/users';
import { getPostsByUserId } from '../../api/posts';
import PostFeed from '../../components/PostFeed/PostFeed';
import './ProfilePage.css';
import FollowButton from '../../components/FollowButton/FollowButton';
import { convertBackendPostToDisplayPost } from '../../utils/postUtils';

interface ProfileProps {
  appUser: User | null;
  userCache: Record<string, User>;
}

const ProfilePage: React.FC<ProfileProps> = ({ appUser, userCache }) => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState<string>(user?.bio || '');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      if (!userId) {
        setError('No user ID provided');
        return;
      }

      const [userData, userBackendPosts] = await Promise.all([
        getUserById(userId),
        getPostsByUserId(userId)
      ]);

      setUser(userData);
      setBioInput(userData.bio || '');
      
      const userPosts: DisplayPost[] = userBackendPosts
        .map(backendPost => convertBackendPostToDisplayPost(backendPost, userData))
        .filter((post): post is DisplayPost => post !== null);

      setPosts(userPosts);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBio = async () => {
    if (!appUser || !appUser._id) {
      setIsEditingBio(false); // close the editor
      alert("You must be logged in to save your bio. Please log in again.");
      return;
    }

    if (isSavingBio) return; // multiple clicks not allowed

    setIsSavingBio(true);

    try {
      await updateBio(appUser._id, bioInput);
      setUser({ ...user!, bio: bioInput }); // update the local user state
      setIsEditingBio(false); // exit editing
    } catch (error) {
      console.error('Failed to update bio:', error);
    } finally {
      setIsSavingBio(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);
  useEffect(() => {
    const handleFollowChange = () => {
      fetchProfileData(); 
    };
  
    window.addEventListener("follow-update", handleFollowChange);
    return () => window.removeEventListener("follow-update", handleFollowChange);
  }, []);
  

  // close the bio editing form if the user logs out or refreshes page
  useEffect(() => {
    if (isEditingBio && (!appUser || appUser._id !== userId)) {
        console.log("[ProfilePage Effect] User logged out or profile changed while editing bio. Closing editor.");
        setIsEditingBio(false);
        if (user) {
           setBioInput(user.bio || '');
        }
    }
  }, [appUser, userId, isEditingBio]);

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
          <div className='profile-name-follow'>
            <h1 className="profile-username">{user.username}</h1>
            <FollowButton
              appUser={appUser}
              targetUserID={userId}
            />
          </div>
          {isEditingBio ? (
            <div className="edit-bio">
              <textarea
                className="bio-input"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <div className="edit-bio-actions"> {/* ADD THIS WRAPPER */}
                <button className="save-bio-button" onClick={handleUpdateBio}>
                  Save
                </button>
                <button className="cancel-bio-button" onClick={() => setIsEditingBio(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display bio or placeholder
            <>
              {user.bio ? (
                <p className="profile-bio">{user.bio}</p>
              ) : (
                appUser?._id === userId && (
                  <p className="profile-bio-placeholder">
                    Add a bio to let others know more about you!
                  </p>
                )
              )}
              {/* "Update Bio" Button (only if it's the current user's profile) */}
              {appUser?._id === userId && !isEditingBio && (
                <button
                  className="update-bio-button"
                  onClick={() => {
                    setBioInput(user.bio || ''); // Pre-fill textarea
                    setIsEditingBio(true);
                  }}
                >
                  Edit Bio
                </button>
              )}
            </>
          )}
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat">
              <span className="stat-value">{user.followers || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat">
              <span className="stat-value">{user.followingUserIDs?.length || 0}</span>
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

export default ProfilePage;
