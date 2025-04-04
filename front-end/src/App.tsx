import './App.css';
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import PostFeed from "./components/PostFeed/PostFeed";
import Footer from "./components/Footer";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import PostPage from "./pages/PostPage";
import { useEffect, useState } from "react";
import { Post } from "./models/Post"
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
if (!googleClientId) {
  console.error("Error. VITE_GOOGLE_CLIENT_ID env variable not set.")
}

function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ username: "", description: "", imagePath: "", profilePicPath: "" });

  const fetchPosts = () => {
    fetch("http://localhost:7005/api/data") // Fetches from API endpoint declared in server
    .then((response) => response.json())
    .then((data) => {
      setPosts(data);
      setLoading(false);
    })
    .catch((error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewPost({ ...newPost, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    fetch("http://localhost:7005/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    })
      .then((response) => response.json())
      .then((data) => {
        setPosts([...posts, data]); // Add the new post to state
        fetchPosts();
        setNewPost({ username: "", description: "", imagePath: "", profilePicPath: "" }); // Reset create post form
      })
      .catch((error) => console.error("Error adding post:", error));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
       <Router>
        <Navbar />
        <main style={{ paddingTop: "64px", textAlign: "center" }}>
          <Routes>
           {/* Home Route (Default) */}
            <Route path="/" element={

        <div className="App">
  
        <div className="post-form">
        <h2>Create a Post</h2>
          <form onSubmit={handleSubmit}>
            <input type="text" name="username" placeholder="Username" value={newPost.username} onChange={handleInputChange} required />
            <input type="text" name="profilePicPath" placeholder="Profile Pic URL" value={newPost.profilePicPath} onChange={handleInputChange} />
            <input type="text" name="imagePath" placeholder="Post Image URL" value={newPost.imagePath} onChange={handleInputChange} />
            <textarea name="description" placeholder="Write something..." value={newPost.description} onChange={handleInputChange} required />
            <button type="submit">Post</button>
          </form>
        </div>

        <div className="Posts">
          {loading ? <p>Loading posts...</p> : <PostFeed posts={posts} />}
        </div>
        </div>
         } />
         {/* Other Pages */}
         <Route path="/explore" element={<Explore />} />
         <Route path="/post" element={<PostPage />} />
         <Route path="/profile" element={<Profile />} />
       </Routes>
       </main>
        <Footer />
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
