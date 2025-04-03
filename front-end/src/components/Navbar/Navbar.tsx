import './Navbar.css';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google'; 
import { jwtDecode, JwtPayload } from 'jwt-decode';

interface GoogleIdTokenPayload extends JwtPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export default function Navbar() {
  const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
    console.log("Google login success. Credential response: ", credentialResponse)

    const idToken = credentialResponse.credential

    if (idToken) {
      console.log("ID token JWT: ", idToken)

      try {
        const decodedToken = jwtDecode<GoogleIdTokenPayload>(idToken)

        console.log("decoded token:", decodedToken)

        alert(`Login Successful! Welcome ${decodedToken.name || 'User'}`);
        console.log("Email:", decodedToken.email);
        console.log("User ID (sub):", decodedToken.sub);
      } catch (error) {
        console.error("error decoding JWT token:", error)
        alert("Failed to process login info")
      }
    } else {
      console.error("login successful but no id token found")
      alert ("login succeeded but failed to get user details")
    }
  }

  const handleLoginError = () => {
    console.error('Google Login Failed');
    alert('Login Failed. Check the console for details.');
  };


  return (
    <nav className="navbar">
      <div className="navbar-logo">
        RetroInsta
      </div>
      <ul className="navbar-links">
        <li>
        <GoogleLogin
             onSuccess={handleLoginSuccess}
             onError={handleLoginError}
             // type="standard"
             // theme="outline"
             // size="medium"
           />
        </li>
      </ul>
    </nav>
  );
};
