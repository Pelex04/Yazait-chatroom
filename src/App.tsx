/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import Login from "./components/Login";
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

      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();

          setCurrentUser(userData.user);
          setIsAuthenticated(true);

          socketService.connect(token);
        } catch (error: any) {
          localStorage.removeItem("token");
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
    setCurrentUser(user);
    setIsAuthenticated(true);

    
    socketService.connect(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
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

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

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

  return (
    <LearningPlatformChat onLogout={handleLogout} currentUser={currentUser} />
  );
}

export default App;
