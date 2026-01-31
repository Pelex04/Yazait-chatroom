/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { MessageCircle } from 'lucide-react';

const SSOHandler = ({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Verifying credentials...');
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const processSSO = async () => {
      try {
        // Extract token from URL
        const ssoToken = searchParams.get('token');
        
        if (!ssoToken) {
          setError('Authentication token missing');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Send token to backend
        const response = await authAPI.ssoLogin(ssoToken);

        if (response.success) {
          // Set user info for display
          setUserInfo({
            name: response.user.name,
            email: response.user.email
          });
          
          setStatus('Authentication successful!');
          
          // Store authentication data
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // Store platform URL for logout redirect
          if (response.platform_url) {
            localStorage.setItem('platform_url', response.platform_url);
          }
          
          // Update app state
          onLoginSuccess(response.token, response.user);
          
          // Redirect to chat after brief delay
          setTimeout(() => navigate('/'), 800);
        } else {
          setError(response.error || 'Authentication failed');
          setTimeout(() => navigate('/'), 5000);
        }
      } catch (err: any) {
        console.error('SSO authentication error:', err);
        setError('Unable to authenticate. Please try again.');
        setTimeout(() => navigate('/'), 5000);
      }
    };

    processSSO();
  }, [searchParams, navigate, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Logo/Brand */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          ChezaX Chatroom
        </h1>

        {!error ? (
          <div className="text-center">
            {/* Loading Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20">
                  <svg className="animate-spin w-full h-full text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                
                {/* Success Checkmark Animation */}
                {userInfo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {status}
              </h2>
              
              {userInfo ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-green-900">
                    Welcome back, {userInfo.name.split(' ')[0]}!
                  </p>
                  <p className="text-xs text-green-700">
                    {userInfo.email}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Please wait while we verify your credentials...
                </p>
              )}

              {/* Progress Indicator */}
              {!userInfo && (
                <div className="flex justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Error Message */}
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Authentication Failed
            </h2>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>

            <p className="text-xs text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-gray-700">Rasta Kadema</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Secure Single Sign-On
          </p>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SSOHandler;