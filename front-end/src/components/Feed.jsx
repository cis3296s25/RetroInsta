import React from "react";
import Avatar from "@mui/material/Avatar";
import "./Feed.css"; // Import the CSS file

const posts = [
  {
    id: 1,
    username: "first_name",
    avatar: "testimage/avatar.jpeg",
    image: "testimage/mountain.jpeg",
    description: "description 1!",
  },
  {
  id: 2,
  username: "second284",
  avatar: "testimage/man.jpeg",
  image: "testimage/bridge.jpeg",
  description: "this sentence is a test",
},
];

const Post = ({ username, avatar, image, description }) => {
  return (
    <div className="post">
      <div className="post-header">
        <Avatar className="avatar" src={avatar} alt={username} />
        <span className="username">{username}</span>
      </div>
      <img className="post-image" src={image} alt="Post" />
      <div className="post-content">
        <div className="post-actions">
          <span className="like">❤️</span>
          <span className="comment">💬</span>
        </div>
        <p>
          <strong>{username}</strong> {description}
        </p>
      </div>
    </div>
  );
};

const Feed = () => {
  return (
    <div className="feed">
      {posts.map((post) => (
        <Post key={post.id} {...post} />
      ))}
    </div>
  );
};

export default Feed;
