/* eslint-disable @typescript-eslint/no-explicit-any */
// Chatroom/src/components/SSOHandler.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

const SSOHandler = ({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Authenticating...');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const processSSO = async () => {
      try {
        // Get token from URL
        const ssoToken = searchParams.get('token');
        
        console.log('🔍 SSO Token from URL:', ssoToken?.substring(0, 50) + '...');
        setDebugInfo(`Token length: ${ssoToken?.length || 0} characters`);
        
        if (!ssoToken) {
          setError('No authentication token provided');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        setStatus('Verifying credentials...');

        // Send token to backend for validation
        const response = await authAPI.ssoLogin(ssoToken);

        if (response.success) {
          setStatus('Login successful! Redirecting...');
          
          // Store token and user data
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          console.log('✅ Stored in localStorage');
          
          // Call parent's login handler
          onLoginSuccess(response.token, response.user);
          
          // Navigate to chat
          setTimeout(() => navigate('/'), 500);
        } else {
          setError(response.error || 'Authentication failed');
          setTimeout(() => navigate('/'), 5000);
        }
      } catch (err: any) {
        console.error('💥 SSO Error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
        setDebugInfo(err.stack || JSON.stringify(err));
        setTimeout(() => navigate('/'), 5000);
      }
    };

    processSSO();
  }, [searchParams, navigate, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {!error ? (
          <>
            {/* Loading Animation */}
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome Back!
            </h2>
            <p className="text-gray-600 mb-4">{status}</p>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>

            {debugInfo && (
              <p className="text-xs text-gray-400 mt-4">{debugInfo}</p>
            )}
          </>
        ) : (
          <>
            {/* Error State */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-red-600 mb-2 font-semibold">{error}</p>
            <p className="text-sm text-gray-500 mb-4">Redirecting to login...</p>

            {/* Debug Info */}
            {debugInfo && (
              <details className="text-left mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                  {debugInfo}
                </pre>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SSOHandler;