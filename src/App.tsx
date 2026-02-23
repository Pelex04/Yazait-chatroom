/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Chatroom/src/App.tsx

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import SSOHandler from "./components/SSOHandler";
import LearningPlatformChat from "./components/chat";
import MaintenancePage from "./components/MaintenancePage.tsx";
import ModuleSelector from "./components/two";
import socketService from "./services/socket";
import { authAPI, moduleAPI } from "./services/api";
import AdminPanel from "./components/AdminPanel.tsx";

interface Module {
  id: string;
  name: string;
  code: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // ── Step 1: App init ──────────────────────────────────────────────────────
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const healthResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatroom-h46w.onrender.com'}/health`);
        const healthData = await healthResponse.json();
        if (healthResponse.status === 503 || healthData.maintenanceMode) {
          setIsMaintenanceMode(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('[App] Cannot reach backend:', error);
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        } else {
          const response = await authAPI.getCurrentUser();
          setCurrentUser(response.user);
          localStorage.setItem("user", JSON.stringify(response.user));
        }
        socketService.connect(token);
        setIsAuthenticated(true); // triggers the modules useEffect below
      } catch (error: any) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("platform_url");
        localStorage.removeItem("selectedModule");
      }

      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // ── Step 2: Fetch modules whenever user becomes authenticated ─────────────
  // This runs AFTER isAuthenticated flips to true, guaranteeing the token
  // is already in localStorage before any API call fires.
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadModules = async () => {
      setModulesLoading(true);
      try {
        const data = await moduleAPI.getMyModules();
        setModules(data);
      } catch (error) {
        console.error('[App] Failed to fetch modules:', error);
        setModules([]);
      } finally {
        setModulesLoading(false);
      }

      // Restore previously selected module if any
      const storedModule = localStorage.getItem("selectedModule");
      if (storedModule) {
        setSelectedModule(JSON.parse(storedModule));
      }
    };

    loadModules();
  }, [isAuthenticated]);

  // ── Login / SSO success ───────────────────────────────────────────────────
  const handleLoginSuccess = (token: string, user: any) => {
    // Token is already written to localStorage by Login.tsx / SSOHandler.tsx
    // We just sync state here — the useEffect above will fetch modules
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.removeItem("selectedModule");
    setCurrentUser(user);
    setSelectedModule(null);
    socketService.connect(token);
    setIsAuthenticated(true); // this triggers the modules useEffect
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    const platformUrl = localStorage.getItem("platform_url");
    socketService.disconnect();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedModule");
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedModule(null);
    setModules([]);

    if (platformUrl) {
      localStorage.removeItem("platform_url");
      window.location.href = platformUrl;
    }
  };

  // ── Module selection ──────────────────────────────────────────────────────
  const handleSelectModule = (module: Module) => {
    setSelectedModule(module);
    localStorage.setItem("selectedModule", JSON.stringify(module));
  };

  const handleBackToSelector = () => {
    setSelectedModule(null);
    localStorage.removeItem("selectedModule");
  };

  // ── Render ────────────────────────────────────────────────────────────────
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

  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }

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
              selectedModule ? (
                <LearningPlatformChat
                  onLogout={handleLogout}
                  currentUser={currentUser}
                  selectedModule={selectedModule}
                  onBack={handleBackToSelector}
                />
              ) : (
                <ModuleSelector
                  user={currentUser}
                  modules={modules}
                  onSelectModule={handleSelectModule}
                  onLogout={handleLogout}
                  isLoading={modulesLoading}
                />
              )
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