import React from "react";
import { useState } from "react";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer";

const Post: React.FC = () => {
    const [newPost, setNewPost] = useState({
        username: "",
        description: "",
        imagePath: "",
        profilePicPath: "",
    });

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
          .then(() => {
            alert("Post created successfully!");
            setNewPost({ username: "", description: "", imagePath: "", profilePicPath: "" });
          })
          .catch((error) => console.error("Error adding post:", error));
    };



  return (
    <div>
      <Navbar />
      <main style={{ paddingTop: "64px", textAlign: "center" }}>
        <h1>Create a post</h1>
        <form 
          onSubmit={handleSubmit} 
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", maxWidth: "400px", margin: "0 auto" }}
        >
          <input 
            type="text" 
            name="username" 
            placeholder="Username" 
            value={newPost.username} 
            onChange={handleInputChange} 
            required 
          />
          <input 
            type="text" 
            name="profilePicPath" 
            placeholder="Profile Pic URL" 
            value={newPost.profilePicPath} 
            onChange={handleInputChange} 
          />
          <input 
            type="text" 
            name="imagePath" 
            placeholder="Post Image URL" 
            value={newPost.imagePath} 
            onChange={handleInputChange} 
          />
          <textarea 
            name="description" 
            placeholder="Write something..." 
            value={newPost.description} 
            onChange={handleInputChange} 
            required 
          />
          <button type="submit">Post</button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Post;
