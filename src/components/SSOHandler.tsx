/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const SSOHandler = ({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Verifying your credentials');
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
          
          setStatus('Authentication successful');
          
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar - Subtle branding */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold text-gray-900 tracking-tight">
              ChezaX
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          
          {!error ? (
            // Success/Loading State
            <div className="text-center space-y-8">
              {/* Icon with animation */}
              <div className="flex justify-center">
                <div className="relative">
                  {userInfo ? (
                    // Success state
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center animate-scale-in">
                      <CheckCircle2 className="w-9 h-9 text-green-600" strokeWidth={2} />
                    </div>
                  ) : (
                    // Loading state
                    <div className="w-16 h-16 relative">
                      <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  {status}
                </h1>
                
                {userInfo ? (
                  <div className="space-y-2">
                    <p className="text-base text-gray-900">
                      Welcome, {userInfo.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {userInfo.email}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    This will only take a moment
                  </p>
                )}
              </div>

              {/* Progress dots */}
              {!userInfo && (
                <div className="flex justify-center gap-1.5 pt-2">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>
          ) : (
            // Error State
            <div className="text-center space-y-8">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-9 h-9 text-red-600" strokeWidth={2} />
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Authentication failed
                </h1>
                
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-900">{error}</p>
                </div>

                <p className="text-sm text-gray-500 pt-2">
                  Redirecting you back...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Powered by */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-center text-xs text-gray-500">
            Powered by <span className="font-medium text-gray-700">Rasta Kadema</span>
          </p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default SSOHandler;