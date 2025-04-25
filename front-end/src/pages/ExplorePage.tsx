import React from "react";
import PostFeed from "../components/PostFeed/PostFeed";
import { DisplayPost } from "../models/Post";
import { User } from "../models/User";

interface ExplorePageProps {
  posts: DisplayPost[];
  postsLoading: boolean;
  appUser: User | null;
  userCache: React.MutableRefObject<Record<string, User>>;
}

const ExplorePage: React.FC<ExplorePageProps> = ({ posts, postsLoading, appUser, userCache }) => {
  const sortedPosts = [...posts].sort((a, b) => b.likes - a.likes);
  return (
    <div className="Posts">

      <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333' }}>
        Explore Popular Posts
      </h2>
      {postsLoading ? (
        <p>Loading posts...</p>
      ) : posts.length > 0 ? (
        <PostFeed posts={sortedPosts} appUser={appUser} userCache={userCache} />
      ) : (
        <p>No posts available. Be the first to create one!</p>
      )}
    </div>
  );
};

export default ExplorePage;