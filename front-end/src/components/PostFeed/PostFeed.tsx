import React from "react";
import "./PostFeed.css";
import { DisplayPost } from '../../models/Post';
import PostComponent from '../PostComponent/PostComponent';
import { User } from "../../models/User";

interface PostFeedProps {
  posts: DisplayPost[];
  appUser: User | null;
  userCache?: React.MutableRefObject<Record<string, User>>; 
  onUserUpdate?: () => void; 
  postsLoading?: boolean;
}


const Feed: React.FC<PostFeedProps> = ({ posts, appUser, userCache, onUserUpdate }) => {
  return (
    <div className="feed">
      {posts.map((post) => (
        <PostComponent
          key={post._id}
          post={post}
          appUser={appUser}
          userCache={userCache}
          onUserUpdate={onUserUpdate} 
        />
      ))}
    </div>
  );
};

export default Feed;
