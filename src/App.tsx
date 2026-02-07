/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Chatroom/src/App.tsx - WITH MAINTENANCE MODE

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import SSOHandler from "./components/SSOHandler";
import LearningPlatformChat from "./components/chat";
import MaintenancePage from "./components/MaintenancePage.tsx";
import socketService from "./services/socket";
import { authAPI } from "./services/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // First, check if backend is in maintenance mode
      try {
        const healthResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatroom-h46w.onrender.com'}/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.status === 503 || healthData.maintenanceMode) {
          console.log('[MAINTENANCE] Backend is in maintenance mode');
          setIsMaintenanceMode(true);
          setIsLoading(false);
          return; // Stop initialization, show maintenance page
        }
      } catch (error) {
        // If we can't reach the backend at all, assume maintenance
        console.error('[MAINTENANCE] Cannot reach backend, assuming maintenance mode:', error);
        setIsMaintenanceMode(true);
        setIsLoading(false);
        return;
      }

      // If not in maintenance mode, proceed with normal authentication
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

    initializeApp();
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600">Loading ChezaX...</p>
        </div>
      </div>
    );
  }

  // Maintenance mode - show to everyone
  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }

  // Normal app flow
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