import React from "react";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer";
import{ useEffect, useState } from "react";
import PostFeed from "../components/PostFeed/PostFeed";
import { Post } from "../models/Post";


const Explore: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
  

    useEffect(() => {
        fetch("http://localhost:7005/api/data")
          .then((response) => response.json())
          .then((data) => {
            setPosts(data);
            setLoading(false);
          })
          .catch((error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
          });
      }, []);

  return (
    <div>
      <Navbar />
      <main style={{ paddingTop: "64px", textAlign: "center" }}>
        <h1>Explore Page</h1>
      </main>
      {loading ? <p>Loading posts...</p> : <PostFeed posts={posts} />}
      <Footer />
    </div>
  );
};

export default Explore;
