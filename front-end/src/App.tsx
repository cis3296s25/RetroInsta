import './App.css';
import Navbar from "./components/Navbar/Navbar";
import CreatePostPopup from "./components/CreatePostPopup/CreatePostPopup";
import SideBar from "./components/SideBar/SideBar";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import ExplorePage from "./pages/ExplorePage";
import HomePage from './pages/HomePage';
import FollowingSidebar from './components/FollowingSidebar/FollowingSidebar';
import { useCallback, useEffect, useRef, useState } from "react";
import { DisplayPost, BackendPost } from "./models/Post";
import { CreatePostPayload, PostFormData } from './models/CreatePostData';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { User } from './models/User';
import { createPost, getAllPosts, fetchPersonalPosts } from './api/posts';
import { fetchGoogleClientId, loginWithGoogleApi as loginWithGoogle } from './api/auth';
import { getUserById, getUserById as getUserDataById } from './api/users';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

const LOCAL_STORAGE_USER_ID_KEY = 'user_id';

function App() {
  const [explorePosts, setExplorePosts] = useState<DisplayPost[]>([]);
  const [personalPosts, setPersonalPosts] = useState<DisplayPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isCreatePostPopupOpen, setIsCreatePostPopupOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [clientIdLoading, setClientIdLoading] = useState(true);
  const [clientIdError, setClientIdError] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const userCache = useRef<Record<string, User>>({});
  const navigate = useNavigate();

  // Helper function to process posts (avoids repetition)
  const processBackendPosts = (
      backendPosts: BackendPost[],
      usersMap: Record<string, User>
  ): DisplayPost[] => {
      return backendPosts.map(post => {
          const author = usersMap[post.authorID];
          if (!author) {
              console.warn(`[ProcessPosts] Author ${post.authorID} not found in map for post ${post._id}.`);
              return null;
          }
          const { authorID, ...rest } = post;
          return { ...rest, author };
      }).filter((p): p is DisplayPost => p !== null);
  };


  const fetchAndProcessPosts = useCallback(async () => {
    console.log("[App] Fetching and processing posts...");
    setPostsLoading(true);
    const currentUserId = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY); // Get current user ID

    try {
      const allBackendPosts = await getAllPosts();
      console.log(`[App] Fetched ${allBackendPosts.length} total posts.`);

      const uniqueAuthorIDs = [...new Set(
        allBackendPosts.map(p => p.authorID).filter((id): id is string => /^[0-9a-fA-F]{24}$/.test(id))
      )];

      const idsToFetch: string[] = [];
      const usersFromCache: Record<string, User> = {};
      uniqueAuthorIDs.forEach(id => {
        if (userCache.current[id]) usersFromCache[id] = userCache.current[id];
        else idsToFetch.push(id);
      });

      console.log(`[App] Need to fetch ${idsToFetch.length} authors for all posts.`);
      const userPromises = idsToFetch.map(id => getUserById(id).catch(() => null));
      const usersOrNulls = await Promise.all(userPromises);
      const fetchedUsers: Record<string, User> = {};
      usersOrNulls.forEach(user => {
        if (user) {
          fetchedUsers[user._id] = user;
          userCache.current[user._id] = user;
        }
      });
      const allUsersMap = { ...usersFromCache, ...fetchedUsers };
      console.log(`[App] Total users in cache/fetched: ${Object.keys(allUsersMap).length}`);

      const processedExplorePosts = processBackendPosts(allBackendPosts, allUsersMap);

      setExplorePosts(processedExplorePosts);
      console.log(`[App] Processed ${processedExplorePosts.length} posts for Explore.`);

      if (currentUserId) {
        console.log(`[App] User ${currentUserId} is logged in. Fetching personal feed...`);
        try {
          const personalBackendPosts = await fetchPersonalPosts(currentUserId);
          console.log(`[App] Fetched ${personalBackendPosts.length} posts for personal feed.`);
          const processedPersonalPosts = processBackendPosts(personalBackendPosts, allUsersMap);
          setPersonalPosts(processedPersonalPosts);
          console.log(`[App] Processed ${processedPersonalPosts.length} posts for Home.`);
        } catch (personalFetchError) {
            console.error("[App] Failed to fetch personal posts:", personalFetchError);
            setPersonalPosts([]); // clear personal posts on error
        }
      } else {
        console.log("[App] User not logged in. Clearing personal feed.");
        setPersonalPosts([]); // clear personal posts if not logged in
      }

    } catch (error) {
      console.error("Error fetching or processing posts:", error);
      setExplorePosts([]);
      setPersonalPosts([]);
    } finally {
      setPostsLoading(false);
      console.log("[App] Finished fetching and processing posts.");
    }
  }, []);

  useEffect(() => {
      console.log("[App] Effect triggered: Fetching posts based on user state.");
      fetchAndProcessPosts();
   }, [appUser, fetchAndProcessPosts]);

  const handleLogout = useCallback(() => {
    console.log("[App] User logged out.");
    setAppUser(null);
    setPersonalPosts([]);
    localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY);
    
    navigate('/explore', { replace: true });
    console.log("[App] Navigated to /explore after logout.");
  }, [navigate]);

  const handleLoginError = useCallback(() => {
    console.error("[App] Login error occurred.");
    setAppUser(null);
    setPersonalPosts([]);
    localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY);
  }, []);

  const handleLoginSuccess = useCallback(async (idToken: string) => {
    console.log("[App] Handling login success...");
    setAuthLoading(true);
    try {
      const fetchedUser = await loginWithGoogle({ idToken });
      if (!fetchedUser?._id) throw new Error("Invalid user data received after login.");

      localStorage.setItem(LOCAL_STORAGE_USER_ID_KEY, fetchedUser._id);
      setAppUser(fetchedUser);
      console.log(`[App] User ${fetchedUser.username} logged in successfully.`);
    } catch (error) {
      console.error("[App] Login failed:", error);
      handleLoginError();
    } finally {
      setAuthLoading(false);
    }
  }, [handleLoginError]);

  // --- Restore Session ---
  const restoreUserSession = useCallback(async () => {
    const userId = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
    if (!userId) {
        console.log("[App] No user ID in local storage. Setting user to null.");
        setAppUser(null);
        setPersonalPosts([]);
        return;
    }
    console.log(`[App] Restoring user session for ID: ${userId}`);
    setAuthLoading(true);
    try {
      const user = await getUserDataById(userId);
      setAppUser(user);
       console.log(`[App] User session restored for ${user.username}.`);
    } catch (error) {
        console.error("[App] Error restoring user session:", error);
        localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY);
        setAppUser(null);
        setPersonalPosts([]);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // --- Other Handlers ---
  const toggleCreatePostPopup = () => {
    setIsCreatePostPopupOpen(prev => !prev);
  };

  const refreshAppUser = useCallback(async () => {
    const currentUserId = appUser?._id || localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
    if (!currentUserId) {
        console.log("[App] refreshAppUser: No user logged in, skipping refresh.");
        return;
    }
    console.log("[App] Refreshing app user data...");
    try {
      const updatedUser = await getUserById(currentUserId);
      setAppUser(updatedUser);
      userCache.current[updatedUser._id] = updatedUser;
      console.log("[App] App user refreshed.");
    } catch (error) {
      console.error("[App] Failed to refresh user:", error);
    }
  }, [appUser?._id]); 

  useEffect(() => {
    const handleGlobalFollowUpdate = () => {
      console.log("[App] Detected follow-update event. Refreshing appUser state.");
      refreshAppUser();
    };

    window.addEventListener('follow-update', handleGlobalFollowUpdate);

    return () => {
      window.removeEventListener('follow-update', handleGlobalFollowUpdate);
    };
  }, [refreshAppUser]);


  const handleCreatePostSubmit = useCallback(async (formData: PostFormData) => {
    if (!appUser || !formData.imageFile) {
        alert("You must be logged in and select an image.");
        return;
    }
    const payload: CreatePostPayload = {
      authorID: appUser._id,
      imageFile: formData.imageFile,
      description: formData.description || "",
    };
    console.log("[App] Submitting new post...");
    try {
      await createPost(payload);
      console.log("[App] Post created successfully. Re-fetching all posts.");
      await fetchAndProcessPosts();
      setIsCreatePostPopupOpen(false);
    } catch (error) {
        console.error("[App] Failed to create post:", error);
        alert("Failed to create post.");
    }
  }, [appUser, fetchAndProcessPosts]);

  // --- Effects ---
  // Load Client ID on mount
  useEffect(() => {
    const loadClientID = async () => {
      console.log("[App] Loading Google Client ID...");
      setClientIdLoading(true);
      try {
        setGoogleClientId(await fetchGoogleClientId());
         console.log("[App] Google Client ID loaded.");
      } catch(err) {
          console.error("[App] Failed to load Google Client ID:", err);
          setClientIdError("Google Login initialization failed. Please try again later.");
      } finally {
        setClientIdLoading(false);
      }
    };
    loadClientID();
  }, []);

  // Restore session once client ID is loaded
  useEffect(() => {
    if (!clientIdLoading && !clientIdError) {
      console.log("[App] Client ID ready, restoring user session...");
      restoreUserSession();
    } else if (clientIdError) {
       console.warn("[App] Cannot restore session due to Client ID error.");
    }
  }, [clientIdLoading, clientIdError, restoreUserSession]);


  // Render Loading or Error state for Client ID
  if (clientIdLoading) {
      return <div>Loading Authentication...</div>;
  }
  if (clientIdError) {
      return <div>Error: {clientIdError}</div>;
  }

  // --- Render App ---
  return (
    <GoogleOAuthProvider clientId={googleClientId ?? ''}>
      <div className="App">
        <SideBar
          currentUser={appUser}
          onAddPostClick={toggleCreatePostPopup}
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
        />

        <div className="main-content">
          <Navbar
            user={appUser}
            authLoading={authLoading}
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
            onLogout={handleLogout}
          />

          <div className="page-layout">
            <div className="page-content">
              {postsLoading && !authLoading ? <p>Loading content...</p> : (
                 <Routes>
                    <Route path="/" element={<Navigate to="/explore" replace />} />

                    <Route
                       path="/explore"
                       element={
                          <ExplorePage
                             posts={explorePosts}
                             postsLoading={postsLoading}
                             appUser={appUser}
                             userCache={userCache}
                          />
                       }
                    />

                    <Route
                       path="/home"
                       element={
                          appUser ? (
                             <HomePage
                                posts={personalPosts}
                                postsLoading={postsLoading}
                                appUser={appUser}
                                userCache={userCache}
                                onUserUpdate={refreshAppUser}
                             />
                          ) : (
                             <Navigate to="/explore" replace />
                          )
                       }
                    />

                    <Route
                       path="/profile/:userId"
                       element={
                          <ProfilePage
                             appUser={appUser}
                             userCache={userCache.current}
                          />
                       }
                    />

                    <Route path="*" element={<div>Page Not Found</div>} />
                 </Routes>
              )}
            </div>

            {appUser && (
              <FollowingSidebar
                key={sidebarRefreshKey}
                currentUser={appUser}
                userCache={userCache}
              />
            )}
          </div>
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