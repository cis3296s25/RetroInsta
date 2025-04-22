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
  return (
    <div className="Posts">
      {postsLoading ? (
        <p>Loading posts...</p>
      ) : posts.length > 0 ? (
        <PostFeed posts={posts} appUser={appUser} userCache={userCache} />
      ) : (
        <p>No posts available. Be the first to create one!</p>
      )}
    </div>
  );
};

export default ExplorePage;