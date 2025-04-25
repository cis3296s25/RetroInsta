import React from 'react';
import './SideBar.css';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home'; 
import TravelExploreIcon from '@mui/icons-material/TravelExplore'; 
import PersonIcon from '@mui/icons-material/Person'; 
import AddBoxIcon from '@mui/icons-material/AddBox';
import { User } from '../../models/User';
import GoogleLoginButton from '../GoogleLoginButton/GoogleLoginButton';

interface SideBarProps {
  currentUser?: User | null;
  onAddPostClick: () => void;
  onLoginSuccess: (idToken: string) => void;
  onLoginError: () => void;
}

// for pop up safari mobile bug fix
const portalRoot = document.getElementById('portal-root');

const SideBar: React.FC<SideBarProps> = ({ 
  currentUser, 
  onAddPostClick, 
  onLoginSuccess,
  onLoginError 
}) => {
  const [showLoginPopup, setShowLoginPopup] = React.useState(false);

  const handleProtectedAction = (e: React.MouseEvent) => {
    if (!currentUser) {
      e.preventDefault();
      setShowLoginPopup(true);
    }
  };

  const handleCloseLoginPopup = () => {
    setShowLoginPopup(false);
  };

  const handleGoogleButtonSuccess = (idToken: string) => {
    onLoginSuccess(idToken);
    handleCloseLoginPopup();
  };

  const loginPopup = (
    <div className="login-popup-overlay" onClick={handleCloseLoginPopup}>
      <div className="login-popup-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={handleCloseLoginPopup}>×</button>
        <h3>Please Login</h3>
        <p>You need to be logged in to access this feature.</p>
        <GoogleLoginButton
          onLoginSuccess={handleGoogleButtonSuccess}
          onLoginError={onLoginError}
        />
      </div>
    </div>
  );

  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li className="sidebar-item">
          <Link
            to="/home" 
            className="sidebar-link"
            onClick={handleProtectedAction}
          >
            <HomeIcon className="sidebar-icon" /> 
            <span>Home</span>
            <div className="tooltip">Home</div>
          </Link>
        </li>
        <li className="sidebar-item">
          <Link 
            to="/explore" 
            className="sidebar-link"
          >
            <TravelExploreIcon className="sidebar-icon" />
            <span>Explore</span>
            <div className="tooltip">Explore</div>
          </Link>
        </li>
        <li className="sidebar-item">
          <Link 
            to={currentUser ? `/profile/${currentUser._id}` : "/login"} 
            className="sidebar-link"
            onClick={handleProtectedAction}
          >
            <PersonIcon className="sidebar-icon" />
            <span>Profile</span>
            <div className="tooltip">Profile</div>
          </Link>
        </li>
        <li className="sidebar-item">
          <Link 
            to="#"
            className="sidebar-link"
            onClick={(e) => {
              e.preventDefault();
              if (!currentUser) {
                setShowLoginPopup(true);
              } else {
                onAddPostClick();
              }
            }}
          >
            <AddBoxIcon className="sidebar-icon" />
            <span>Add Post</span>
            <div className="tooltip">Add Post</div>
          </Link>
        </li>
      </ul>

      {showLoginPopup && portalRoot && createPortal(
        loginPopup,
        portalRoot
      )}
    </div>
  );
};

export default SideBar;