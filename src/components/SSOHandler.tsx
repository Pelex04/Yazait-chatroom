/* eslint-disable @typescript-eslint/no-explicit-any */
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
        const ssoToken = searchParams.get('token');
        
        console.log('🔍 SSO Token from URL:', ssoToken?.substring(0, 50) + '...');
        setDebugInfo(`Token length: ${ssoToken?.length || 0} characters`);
        
        if (!ssoToken) {
          setError('No authentication token provided');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        setStatus('Verifying credentials...');

        const response = await authAPI.ssoLogin(ssoToken);

        if (response.success) {
          setStatus('Login successful! Redirecting...');
          
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          console.log('✅ Stored in localStorage');
          
          onLoginSuccess(response.token, response.user);
          
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 w-full max-w-md">
        {!error ? (
          <div className="text-center">
            {/* Loading Spinner */}
            <div className="w-16 h-16 mx-auto mb-6">
              <svg className="animate-spin w-full h-full text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              {status}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              Please wait while we verify your credentials
            </p>
          </div>
        ) : (
          <div className="text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <p className="text-xs text-gray-500 mb-6">Redirecting to login...</p>

            {/* Debug Info - Collapsible */}
            {debugInfo && (
              <details className="text-left mt-4">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Technical details
                </summary>
                <pre className="text-xs bg-gray-50 p-3 rounded mt-2 overflow-auto max-h-32 text-gray-600">
                  {debugInfo}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-medium text-gray-600">Rasta Kadema</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SSOHandler;