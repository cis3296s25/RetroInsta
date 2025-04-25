import './Navbar.css';
import GoogleLoginButton from '../GoogleLoginButton/GoogleLoginButton';
import { User } from '../../models/User';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: User | null;
  authLoading: boolean;
  onLoginSuccess: (idToken: string) => void;
  onLoginError: () => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  onLoginSuccess,
  onLoginError,
  onLogout,
}: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/explore" className="navbar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img 
            src="/insta.png" 
            alt="RetroInsta logo" 
            style={{ height: '40px', marginRight: '8px', verticalAlign: 'middle' }} 
          />
          RetroInsta
        </Link>
      </div>
      <ul className="navbar-links">
        { user ? (
          // ---- Logged In State ----
          <> {/* Use React Fragment */}
            {/* Make username a list item */}
            <li className="navbar-item">
              <span className="user-greeting">{user?.username}</span>
            </li>
            {/* Remove the extra div around the logout button */}
            <li className="navbar-item"> {/* Item for Logout button */}
              <button
                onClick={onLogout}
                className="navbar-button logout-button"
              >
                Logout
              </button>
            </li>
          </>
        ) : (
          // ---- Logged Out State ----
          <li className="navbar-item">
            <GoogleLoginButton
              onLoginSuccess={onLoginSuccess}
              onLoginError={onLoginError}
            />
          </li>
        )}
      </ul>
    </nav>
  );
};