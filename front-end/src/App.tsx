import './App.css';
import Navbar from "./components/Navbar/Navbar";
import PostFeed from "./components/PostFeed/PostFeed";
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
  const [newPost, setNewPost] = useState({ username: "", description: "", imagePath: null, profilePicPath: "" });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
      // Send the post data to the backend to save the post
      const postResponse = await fetch("http://localhost:7005/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
  
      const postDataResponse = await postResponse.json();
      setPosts([...posts, postDataResponse]); // Add the new post to state
      fetchPosts();
      setNewPost({ username: "", description: "", imagePath: null, profilePicPath: "" }); // Reset create post form
    } catch (error) {
      console.error("Error adding post:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="App">
        <Navbar />
        <div className="post-form">
        <h2>Create a Post</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="username" placeholder="Username" value={newPost.username} onChange={handleInputChange} required />
          <input type="text" name="profilePicPath" placeholder="Profile Pic URL" value={newPost.profilePicPath} onChange={handleInputChange} />
          <input type="file" name="imagePath" placeholder="Post Image URL" onChange={handleInputChange} accept="image/*" required/>
          <textarea name="description" placeholder="Write something..." value={newPost.description} onChange={handleInputChange} required />
          <button type="submit">Post</button>
        </form>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
