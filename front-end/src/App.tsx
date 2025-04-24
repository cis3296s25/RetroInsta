import './App.css';
import Navbar from "./components/Navbar/Navbar";
import PostFeed from "./components/PostFeed/PostFeed";
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
import { Routes, Route } from 'react-router-dom';

const LOCAL_STORAGE_USER_ID_KEY = 'user_id';

function App() {
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isCreatePostPopupOpen, setIsCreatePostPopupOpen] = useState(false);
  const [sortedPosts, setSortedPosts] = useState<DisplayPost[]>([]);
  const [personalPosts, setPersonalPosts] = useState<DisplayPost[]>([]);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [clientIdLoading, setClientIdLoading] = useState(true);
  const [clientIdError, setClientIdError] = useState<string | null>(null);
  const userCache = useRef<Record<string, User>>({});

  const sortPostsByLikes = useCallback((posts: DisplayPost[]) => {
    return [...posts].sort((a, b) => b.likes - a.likes);
  }, []);

  const fetchAndProcessPosts = useCallback(async () => {
    setPostsLoading(true);
    let finalPersonalPosts: DisplayPost[] = [];
    try {
      const backendPosts = await getAllPosts();
      const uniqueAuthorIDs = [...new Set(
        backendPosts.map(p => p.authorID).filter((id): id is string => /^[0-9a-fA-F]{24}$/.test(id))
      )];

      const idsToFetch: string[] = [];
      const usersFromCache: Record<string, User> = {};

      uniqueAuthorIDs.forEach(id => {
        if (userCache.current[id]) usersFromCache[id] = userCache.current[id];
        else idsToFetch.push(id);
      });

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

      const processedPosts = backendPosts.map(post => {
        const author = allUsersMap[post.authorID];
        if (!author) return null;
        const { authorID, ...rest } = post;
        return { ...rest, author };
      }).filter((p): p is DisplayPost => p !== null);

      const usrID = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
      if (usrID) {
        try {
          const personal = await fetchPersonalPosts(usrID);
          const personalProcessed = personal.map(post => {
            const author = allUsersMap[post.authorID];
            if (!author) return null;
            const { authorID, ...rest } = post;
            return { ...rest, author };
          }).filter((p): p is DisplayPost => p !== null);

          setPersonalPosts(personalProcessed);
          finalPersonalPosts = personalProcessed;
        } catch {
          setPersonalPosts([]);
        }
      } else {
        setPersonalPosts([]);
      }

      setPosts(finalPersonalPosts.length > 0 ? finalPersonalPosts : processedPosts);
      setSortedPosts(sortPostsByLikes(processedPosts));
    } catch (error) {
      console.error("Error fetching or processing posts:", error);
      setPosts([]);
      setSortedPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [sortPostsByLikes]);

  useEffect(() => { fetchAndProcessPosts(); }, [fetchAndProcessPosts]);

  const handleLogout = useCallback(() => {
    setAppUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY);
    fetchAndProcessPosts();
  }, [fetchAndProcessPosts]);

  const handleLoginError = useCallback(() => {
    setAppUser(null);
    setPosts([]);
  }, []);

  const handleLoginSuccess = useCallback(async (idToken: string) => {
    setAuthLoading(true);
    try {
      const fetchedUser = await loginWithGoogle({ idToken });
      if (!fetchedUser._id) throw new Error("Invalid user data");
      localStorage.setItem(LOCAL_STORAGE_USER_ID_KEY, fetchedUser._id);
      setAppUser(fetchedUser);
      await fetchAndProcessPosts();
    } catch (error) {
      console.error("Login failed:", error);
      handleLoginError();
    } finally {
      setAuthLoading(false);
    }
  }, [handleLoginError, fetchAndProcessPosts]);

  const restoreUserSession = useCallback(async () => {
    const userId = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
    if (!userId) return setAppUser(null);
    setAuthLoading(true);
    try {
      const user = await getUserDataById(userId);
      setAppUser(user);
      fetchAndProcessPosts();
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY);
      setAppUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, [fetchAndProcessPosts]);

  const toggleCreatePostPopup = () => {
    setIsCreatePostPopupOpen(prev => !prev);
  };

  const handleCreatePostSubmit = useCallback(async (formData: PostFormData) => {
    if (!appUser || !formData.imageFile) return alert("You must be logged in and select an image.");
    const payload: CreatePostPayload = {
      authorID: appUser._id,
      imageFile: formData.imageFile,
      description: formData.description || "",
    };
    setPostsLoading(true);
    try {
      await createPost(payload);
      await fetchAndProcessPosts();
      setIsCreatePostPopupOpen(false);
    } catch {
      alert("Failed to create post.");
    } finally {
      setPostsLoading(false);
    }
  }, [appUser, fetchAndProcessPosts]);

  useEffect(() => {
    if (!clientIdLoading && !clientIdError) {
      restoreUserSession();
    }
  }, [clientIdLoading, clientIdError, restoreUserSession]);

  useEffect(() => {
    const loadClientID = async () => {
      setClientIdLoading(true);
      try {
        setGoogleClientId(await fetchGoogleClientId());
      } catch {
        setClientIdError("Google Login init failed.");
      } finally {
        setClientIdLoading(false);
      }
    };
    loadClientID();
  }, []);

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
              <Routes>
                <Route path="/" element={<HomePage posts={posts} postsLoading={postsLoading} appUser={appUser} userCache={userCache} />} />
                <Route path="/explore" element={<ExplorePage posts={sortedPosts} postsLoading={postsLoading} appUser={appUser} userCache={userCache} />} />
                <Route path="/profile/:userId" element={<ProfilePage appUser={appUser} userCache={userCache} />} />
              </Routes>
            </div>

            {appUser && <FollowingSidebar currentUser={appUser} userCache={userCache} />}
            
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
