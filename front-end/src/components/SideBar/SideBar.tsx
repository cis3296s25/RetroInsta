import React from 'react';
import './SideBar.css';
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
  onLoginSuccess: (decodedToken: any, credentialResponse: any) => void;
  onLoginError: () => void;
}

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

  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li className="sidebar-item">
          <Link to="/" className="sidebar-link">
            <HomeIcon className="sidebar-icon" /> 
            <span>Home</span>
            <div className="tooltip">Home</div>
          </Link>
        </li>
        <li className="sidebar-item">
          <Link 
            to="/explore" 
            className="sidebar-link"
            onClick={handleProtectedAction}
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

      {showLoginPopup && (
        <div className="login-popup-overlay" onClick={handleCloseLoginPopup}>
          <div className="login-popup-content" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={handleCloseLoginPopup}>×</button>
            <h3>Please Login</h3>
            <p>You need to be logged in to access this feature.</p>
            <GoogleLoginButton
              onLoginSuccess={(decodedToken, credentialResponse) => {
                onLoginSuccess(decodedToken, credentialResponse);
                handleCloseLoginPopup();
              }}
              onLoginError={onLoginError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SideBar;