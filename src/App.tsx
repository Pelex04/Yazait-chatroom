/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Chatroom/src/App.tsx - WITH MAINTENANCE MODE + AUTH FIX

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import SSOHandler from "./components/SSOHandler";
import LearningPlatformChat from "./components/chat";
import MaintenancePage from "./components/MaintenancePage.tsx";
import socketService from "./services/socket";
import { authAPI } from "./services/api";
import AdminPanel from "./components/AdminPanel.tsx";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // First, check if backend is in maintenance mode
      try {
        const healthResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.status === 503 || healthData.maintenanceMode) {
          console.log('[MAINTENANCE] Backend is in maintenance mode');
          setIsMaintenanceMode(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // ============================================
        // CRITICAL FIX: Can't reach backend ≠ maintenance mode
        // Just show login page - don't assume maintenance
        // ============================================
        console.error('[App] Cannot reach backend:', error);
        setIsLoading(false);
        return;
      }

      // ============================================
      // CRITICAL FIX: Check token FIRST
      // No token = go straight to login, no API calls at all
      // ============================================
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token) {
        console.log("[App] No token found - showing login page");
        setIsLoading(false);
        return;
      }

      // Token exists - try to restore session
      try {
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          socketService.connect(token);
          console.log("[App] Session restored from storage");
        } else {
          // Token exists but no stored user - verify with server
          const userData = await authAPI.getCurrentUser();
          setCurrentUser(userData.user);
          setIsAuthenticated(true);
          socketService.connect(token);
          console.log("[App] Session restored from server");
        }
      } catch (error: any) {
        // Token is invalid or expired - clear everything silently
        console.log("[App] Token invalid/expired - clearing session");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("platform_url");
        setIsAuthenticated(false);
        setCurrentUser(null);
        // NO alert, NO error - just show login page
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
    
    const platformUrl = localStorage.getItem("platform_url");
    console.log("🔍 Platform URL:", platformUrl);
    
    socketService.disconnect();
    
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
        <Route path="/admin/*" element={<AdminPanel />} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;