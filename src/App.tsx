/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Chatroom/src/App.tsx - DEBUG VERSION
// Add console.logs to see what's happening

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
            // SSO login - user already in localStorage
            const userData = JSON.parse(storedUser);
            setCurrentUser(userData);
            setIsAuthenticated(true);
            socketService.connect(token);
          } else {
            // Regular login - fetch from API
            const userData = await authAPI.getCurrentUser();
            setCurrentUser(userData.user);
            setIsAuthenticated(true);
            socketService.connect(token);
          }
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
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
    console.log("🔴 LOGOUT CLICKED");
    
    // Check platform_url BEFORE clearing localStorage
    const platformUrl = localStorage.getItem("platform_url");
    console.log("🔍 Platform URL:", platformUrl);
    console.log("📦 All localStorage:", {
      token: localStorage.getItem("token"),
      user: localStorage.getItem("user"),
      platform_url: platformUrl
    });
    
    // Disconnect socket
    socketService.disconnect();
    
    // Clear auth state
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setCurrentUser(null);
    
    if (platformUrl) {
      console.log("✅ SSO User - Redirecting to:", platformUrl);
      localStorage.removeItem("platform_url");
      window.location.href = platformUrl;
    } else {
      console.log("❌ Direct Login User - Showing login page");
      // React Router will automatically show Login component
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
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