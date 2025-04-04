import React from "react";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer";

const Profile: React.FC = () => {
  return (
    <div>
      <Navbar />
      <main style={{ paddingTop: "64px", textAlign: "center" }}>
        <h1>Profile Page</h1>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
