import React from "react";
import PostFeed from "../components/PostFeed/PostFeed";
import { DisplayPost } from "../models/Post";
import { User } from "../models/User";

interface HomePageProps {
  posts: DisplayPost[];
  postsLoading: boolean;
  appUser: User | null;
  userCache: React.MutableRefObject<Record<string, User>>;
  onUserUpdate?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
  posts,
  postsLoading,
  appUser,
  userCache,
  onUserUpdate, 
}) => {
  return (
    <div className="Posts">

      <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333' }}>
        Your Feed
      </h2>

      {postsLoading ? (
        <p>Loading posts...</p>
      ) : posts.length > 0 ? (
        <PostFeed
          posts={posts}
          appUser={appUser}
          userCache={userCache}
          onUserUpdate={onUserUpdate} 
        />
      ) : (
        <p>Your feed is empty. Follow some users or create your first post!</p>
      )}
    </div>
  );
};


export default HomePage;
