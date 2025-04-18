import './App.css';
import Navbar from "./components/Navbar/Navbar";
import PostFeed from "./components/PostFeed/PostFeed";
import CreatePostPopup from "./components/CreatePostPopup/CreatePostPopup";
import SideBar from "./components/SideBar/SideBar";
import Profile from "./pages/Profile";
import { useCallback, useEffect, useRef, useState } from "react";
import { DisplayPost, BackendPost } from "./models/Post"
import { CreatePostPayload, PostFormData } from './models/CreatePostData';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleIdTokenPayload } from './models/GoogleIdTokenPayload';
import { User } from './models/User';
import { createPost, getAllPosts } from './api/posts';
import { loginWithGoogleApi as loginWithGoogle } from './api/auth';
import { getUserById, getUserById as getUserDataById } from './api/users';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const LOCAL_STORAGE_USER_ID_KEY = 'user_id'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
if (!googleClientId) {
  console.error("Error. VITE_GOOGLE_CLIENT_ID env variable not set.")
}

function App() {
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [appUser, setAppUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [isCreatePostPopupOpen, setIsCreatePostPopupOpen] = useState(false);

  const userCache = useRef<Record<string, User>>({});

  const fetchAndProcessPosts = useCallback(async () => {
    console.log("Fetching posts...");
    setPostsLoading(true);

    try {
      const backendPosts: BackendPost[] = await getAllPosts();
      console.log(`Fetched ${backendPosts.length} raw posts from backend.`);

      if (backendPosts.length === 0) {
        console.log("No posts found.");
        setPosts([]);
        setPostsLoading(false); // Ensure loading state is turned off
        return;
      }

      // --- User Fetching with Cache ---
      const uniqueAuthorIDs = [
        ...new Set(backendPosts
          .map(post => post.authorID)
          .filter((id): id is string => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))
        )
      ];

      if (uniqueAuthorIDs.length === 0) {
        console.warn("No valid author IDs found in posts.");
        setPosts([]);
        setPostsLoading(false); // Ensure loading state is turned off
        return;
      }

      // Check cache: Separate IDs that need fetching from those already cached
      const idsToFetch: string[] = [];
      const usersFromCache: Record<string, User> = {};

      uniqueAuthorIDs.forEach(id => {
        if (userCache.current[id]) {
          usersFromCache[id] = userCache.current[id];
        } else {
          idsToFetch.push(id);
        }
      });

      console.log(`Found ${Object.keys(usersFromCache).length} users in cache.`);
      console.log(`Need to fetch ${idsToFetch.length} users.`);

      let fetchedUsers: Record<string, User> = {};
      if (idsToFetch.length > 0) {
        const userPromises = idsToFetch.map(id =>
          getUserById(id).catch(error => {
            console.warn(`Failed to fetch user ${id}:`, error.message);
            return null; // Return null if a user fetch fails
          })
        );

        const usersOrNulls = await Promise.all(userPromises);

        // Add successfully fetched users to the fetchedUsers map and update the cache
        usersOrNulls.forEach(user => {
          if (user) {
            fetchedUsers[user._id] = user;
            userCache.current[user._id] = user; // Update the cache
          }
        });
        console.log(`Successfully fetched ${Object.keys(fetchedUsers).length} new users.`);
      }

      // Combine cached users and newly fetched users
      const allUsersMap: Record<string, User> = { ...usersFromCache, ...fetchedUsers };
      // --- End User Fetching with Cache ---


      // --- Process Posts ---
      const processedPosts: DisplayPost[] = backendPosts
        .map(post => {
          const author = allUsersMap[post.authorID]; // Use the combined map
          if (!author) {
            // This should happen less often now, only if getUserById failed and wasn't cached
            console.warn(`Author ${post.authorID} not found for post ${post._id}. Skipping post.`);
            return null;
          }
          const { authorID, ...restOfPost } = post;
          return { ...restOfPost, author };
        })
        .filter((p): p is DisplayPost => p !== null);

      console.log(`Processed ${processedPosts.length} posts to display.`);
      setPosts(processedPosts);
      // --- End Process Posts ---

    } catch (error) {
      console.error("Error fetching or processing posts:", error);
      setPosts([]); // Clear posts on error
    } finally {
      setPostsLoading(false);
    }
  }, []); 
  
  // login state
  const handleLogout = useCallback(() => {
    console.log("User logged out")
    setAppUser(null)
    localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY) // clear user ID from local storagefetchAndProcessPosts
    fetchAndProcessPosts()
  }, []);
  
  const handleLoginError = useCallback(async() => {
    console.log("Logging user out.");
    setAppUser(null);
    setPosts([]);
  }, []);
  
  const handleLoginSuccess = useCallback(async (decodedToken: GoogleIdTokenPayload) => {
    console.log("Attempting Google login...");
    setAuthLoading(true);
    const googleId = decodedToken.sub;
    const email = decodedToken.email;
    const profilePicPath = decodedToken.picture;


    console.log("Token Data:", { googleID: googleId, email, profilePicPath: profilePicPath?.substring(0, 30) + "..." });

    if (!googleId || !email) {
      setAuthLoading(false);
      alert("Big fucking error!");
      return;
    }

    try {
      const loginPayload = { googleId, email, profilePicPath }
      const fetchedUser = await loginWithGoogle(loginPayload);

      if (!fetchedUser?._id) {
        console.error("Login Error: Invalid user data received from backend.");
        throw new Error("Invalid user data received after login.");
      }

      localStorage.setItem(LOCAL_STORAGE_USER_ID_KEY, fetchedUser._id);
      setAppUser(fetchedUser);
      console.log(`User logged in: ${fetchedUser.username}`);

      await fetchAndProcessPosts(); // feed might be different based on following list
    } catch (error) {
      console.error("Login failed:", error);
      handleLoginError();
    } finally {
      setAuthLoading(false);
    }
  }, [handleLoginError, fetchAndProcessPosts])

  // get user from local storage so we can persist login state on refresh
  const restoreUserSession = useCallback(async () => {
    const userId = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
    if (!userId) {
      console.log("No user ID found in local storage.");
      fetchAndProcessPosts();
      return;
    }
    
    console.log(`Restoring user session for ID: ${userId}`);
    setAuthLoading(true);
    try {
      const user = await getUserDataById(userId);
      setAppUser(user);
    } catch (error) {
      console.error("Error restoring user session:", error);
      localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY); // Clear bad/invalid ID
      setAppUser(null);
    } finally {
      setAuthLoading(false);
      fetchAndProcessPosts();
    }
  }, [fetchAndProcessPosts]);

  
  // create a post
  const toggleCreatePostPopup = () => {
    setIsCreatePostPopupOpen(prev => !prev);
  };
  
  const handleCreatePostSubmit = useCallback(async (formData: PostFormData) => {
    if (!appUser) {
      console.error("User not logged in. Cannot create post.");
      alert("You must be logged in to create a post.");
      return;
    }
    
    if (!formData.imageFile) {
      console.error("No image file provided.");
      alert("Please select an image to upload.");
      return;
    }
    
    const payload: CreatePostPayload = {
      authorID: appUser._id,
      imageFile: formData.imageFile,
      description: formData.description || "",
    };
    
    setPostsLoading(true);
    
    try {
      const createdPost = await createPost(payload);
      await fetchAndProcessPosts(); // refresh posts after creating a new one
      console.log("Post created successfully:", createdPost);
      setIsCreatePostPopupOpen(false); // Close the popup after successful post
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post.");
    } finally {
      setPostsLoading(false);
    }
  }, [appUser, fetchAndProcessPosts]);

  useEffect(() => {
    console.log("App Mounted. Restoring session and fetching posts...");
    restoreUserSession();
  }, [restoreUserSession]); // Run only when restoreUserSession identity changes
  



  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="App">
        <SideBar 
          currentUser={appUser} 
          onAddPostClick={toggleCreatePostPopup}
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
        />
        {/* Main content is wrapped in a container with left margin to avoid overlap with the fixed sidebar */}
        <div className="main-content" style={{ marginLeft: '220px', padding: '20px' }}>
        <Navbar 
          user={appUser}
          authLoading={authLoading}
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
          onLogout={handleLogout}
          />
        <Routes>
        <Route path="/" element={
        <div className="Posts">
          {postsLoading ? <p>Loading posts...</p> : 
          <PostFeed 
            posts={posts} 
            appUser={appUser}
            userCache={userCache}
            />}
        </div>
         } />
              <Route path="/profile/:userId" element={<Profile userCache={userCache} />} />
        </Routes>
      </div>
      <CreatePostPopup 
            isOpen={isCreatePostPopupOpen}
            onClose={toggleCreatePostPopup}
            onPostSubmit={handleCreatePostSubmit}
            />
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
