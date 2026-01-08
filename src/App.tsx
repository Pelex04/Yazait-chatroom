/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import Login from './components/Login';
import LearningPlatformChat from './components/chat';
import socketService from './services/socket';
import { authAPI } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // ← NEW: Add loading state

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('🔐 Token found, fetching user data...');
          
          // Fetch current user from API using the token
          const userData = await authAPI.getCurrentUser();
          
          console.log('✅ User data received:', userData.user);
          
          setCurrentUser(userData.user);
          setIsAuthenticated(true);
          
          // Connect to WebSocket
          socketService.connect(token);
          
        } catch (error: any) {
          // Token invalid or expired
          console.error('❌ Failed to fetch user:', error);
          console.error('Error details:', error.response?.data);
          
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        console.log('ℹ️ No token found');
      }
      
      setIsLoading(false); // ← NEW: Mark loading complete
    };

    initializeUser();
  }, []);

  const handleLoginSuccess = (token: string, user: any) => {
    console.log('🎉 Login successful:', user);
    
    localStorage.setItem('token', token); // ← IMPORTANT: Save token
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Connect to WebSocket
    socketService.connect(token);
  };

  const handleLogout = () => {
    console.log('👋 Logging out...');
    
    localStorage.removeItem('token');
    socketService.disconnect();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // ===================================================================
  // NEW: Show loading screen while checking authentication
  // ===================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ===================================================================
  // NEW: Don't render chat until currentUser is loaded
  // ===================================================================
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return <LearningPlatformChat onLogout={handleLogout} currentUser={currentUser} />;
}

export default App;