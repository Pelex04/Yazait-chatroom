/* eslint-disable @typescript-eslint/no-explicit-any */
// Chatroom/src/components/chat/ChatHeader.tsx


import { ArrowLeft } from 'lucide-react';

interface ChatHeaderProps {
  currentUser: any;
  onLogout: () => void;
}

const ChatHeader = ({ currentUser, onLogout }: ChatHeaderProps) => {
  // Check if user came via SSO
  const platformUrl = localStorage.getItem('platform_url');
  const hasPlatformUrl = !!platformUrl;

  const handleBackToPlatform = () => {
    if (platformUrl) {
      window.location.href = platformUrl;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* NEW: Back to Platform button - only show for SSO users */}
        {hasPlatformUrl && (
          <button
            onClick={handleBackToPlatform}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            title="Return to main platform"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Back to Platform</span>
            <span className="sm:hidden">Back</span>
          </button>
        )}
        
        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
          YazaIT Chatroom
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* User info */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
            <p className="text-xs text-gray-500">{currentUser.role}</p>
          </div>
          {typeof currentUser.avatar === 'string' && currentUser.avatar.startsWith('http') ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
              {currentUser.avatar || '👤'}
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
