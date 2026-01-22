/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import SSOHandler from "./components/SSOHandler";
import LearningPlatformChat from "./components/chat";
import socketService from "./services/socket";
import { authAPI } from "./services/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token) {
        try {
          if (storedUser) {
            console.log('✅ SSO user found in localStorage');
            const userData = JSON.parse(storedUser);
            setCurrentUser(userData);
            setIsAuthenticated(true);
            socketService.connect(token);
          } else {
            console.log('🔄 Fetching user data from API...');
            const userData = await authAPI.getCurrentUser();
            setCurrentUser(userData.user);
            setIsAuthenticated(true);
            socketService.connect(token);
          }
        } catch (error: any) {
          console.error('❌ Auth error:', error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeUser();
  }, []);

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    socketService.connect(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    socketService.disconnect();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

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

  return (
    <BrowserRouter>
      <Routes>
        {/* SSO Landing Route */}
        <Route 
          path="/sso" 
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <SSOHandler onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* Main Chat Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated && currentUser ? (
              <LearningPlatformChat onLogout={handleLogout} currentUser={currentUser} />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;