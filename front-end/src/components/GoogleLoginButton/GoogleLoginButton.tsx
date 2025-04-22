import { CredentialResponse, GoogleLogin } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onLoginSuccess: (idToken: string) => void;
  onLoginError: () => void;
}

export default function GoogleLoginButton({ onLoginSuccess, onLoginError }: GoogleLoginButtonProps) {

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    console.log("Google login success. Credential response recieved.");
    const idToken = credentialResponse.credential;

    if (!idToken) {
        console.error("login successful but no id token found");
        alert ("login succeeded but failed to get user details");
        onLoginError();
        return;
    }

    onLoginSuccess(idToken);
  };

  const handleError = () => {
    console.error('Google Login Failed');
    alert('Login Failed. Check the console for details.');
    onLoginError();
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
