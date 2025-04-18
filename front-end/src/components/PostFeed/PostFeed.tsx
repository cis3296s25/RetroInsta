import React from "react";
import "./PostFeed.css";
import { DisplayPost } from '../../models/Post';
import PostComponent from '../PostComponent/PostComponent';
import { User } from "../../models/User";

interface PostFeedProps {
  posts: DisplayPost[];
  appUser: User | null;
  userCache?:React.RefObject<Record<string, User>>;
}

const Feed: React.FC<PostFeedProps> = ({ posts, appUser, userCache }) => {
  return (
    <div className="feed">
      {posts.map((post) => (
        <PostComponent 
          key={post._id} 
          post={post}
          appUser={appUser}
          userCache={userCache} 
        />
      ))}
    </div>
  );
};

export default Feed;
