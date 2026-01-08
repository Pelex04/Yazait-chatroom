/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Search,
  Users,
  GraduationCap,
  Settings,
  Circle,
  ChevronDown,
  Phone,
  Video,
  MoreVertical,
  MessageCircle,
  Paperclip,
  Mic,
  Smile,
  Send,
  X,
  Square,
  Check,
  CheckCheck,
  Play,
  Pause,
  LogOut,
} from "lucide-react";
import { cn } from "../lib/utils";
import socketService from "../services/socket";
import { chatAPI, moduleAPI } from "../services/api";

// ============= Types =============

type UserRole = "student" | "teacher";
type SubscriptionTier = "basic" | "premium";
type ChatType = "one_to_one" | "group";
type MessageStatus = "sending" | "sent" | "delivered" | "read";
type NavTab = "groups" | "teachers" | "settings";

interface User {
  id: string;
  name: string;
  role: UserRole;
  subscription: SubscriptionTier;
  avatar: string;
  isOnline: boolean;
  lastActive?: string;
}

interface Module {
  id: string;
  name: string;
  code: string;
}

interface Message {
  id: string;
  clientMessageId?: string;
  roomId: string;
  senderId: string;
  content: string;
  type?: "text" | "audio";
  audioUrl?: string;
  audioDuration?: number;
  timestamp: Date;
  status: MessageStatus;
  readBy: string[];
  deliveredTo: string[];
}

interface ChatRoom {
  id: string;
  moduleId?: string;
  type: ChatType;
  name: string;
  participants: string[];
  unreadCount: number;
}

interface ModuleGroup {
  id: string;
  name: string;
  moduleCode: string;
  module_id: string;
  unreadCount?: number;
}

interface LearningPlatformChatProps {
  currentUser: {
    id: string;
    name: string;
    role: UserRole;
    subscription: SubscriptionTier;
    avatar?: string;
  };
  onLogout: () => void;
}

// ============= Typing Indicator =============

function TypingIndicator({ userName }: { userName?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-in">
      <div className="w-8" />
      <div className="bg-secondary px-4 py-2.5 rounded-2xl flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce-dot" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce-dot-delay-1" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce-dot-delay-2" />
        </div>
      </div>
      {userName && (
        <span className="text-xs text-muted-foreground italic">
          {userName} is typing...
        </span>
      )}
    </div>
  );
}

// ============= Empty State =============

function EmptyState({ type }: { type: "no-chat" | "no-messages" }) {
  if (type === "no-chat") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-chat-message">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Select a conversation
        </h2>
        <p className="text-sm text-center max-w-sm">
          Choose a contact or group from the sidebar to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        No messages yet
      </h3>
      <p className="text-sm">Start the conversation!</p>
    </div>
  );
}

// ============= Audio Player =============

function AudioPlayer({
  id,
  audioUrl,
  duration,
  isOwn,
  playingAudioId,
  onPlay,
}: {
  id: string;
  audioUrl: string;
  duration: number;
  isOwn: boolean;
  playingAudioId?: string | null;
  onPlay?: (id: string) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (playingAudioId !== id && audioRef.current) {
      audioRef.current.pause();
      // Wrap state update in a timeout to avoid synchronous setState in effect
      setTimeout(() => setIsPlaying(false), 0);
    }
  }, [playingAudioId, id]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      onPlay?.(id);
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
          isOwn
            ? "bg-white/20 hover:bg-white/30"
            : "bg-primary/20 hover:bg-primary/30"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1">
        <div
          className={cn(
            "h-1 rounded-full overflow-hidden",
            isOwn ? "bg-white/30" : "bg-muted"
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOwn ? "bg-white" : "bg-primary"
            )}
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>
        <div className="text-xs opacity-75 mt-1">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

        <audio
          ref={audioRef}
          src={`http://localhost:5000${audioUrl}`}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          className="hidden"
        />
    </div>
  );
}

// ============= Message Status Icon =============

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === "sending") {
    return (
      <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
    );
  }

  if (status === "read") {
    return <CheckCheck className="w-4 h-4 text-chat-sent" />;
  }

  if (status === "delivered") {
    return <CheckCheck className="w-4 h-4 text-muted-foreground" />;
  }

  return <Check className="w-4 h-4 text-muted-foreground" />;
}

// ============= Message Bubble =============

function MessageBubble({
  id,
  content,
  type = "text",
  audioUrl,
  audioDuration = 0,
  timestamp,
  isOwn,
  senderName,
  senderAvatar,
  showAvatar = true,
  status = "sent",
  isGroup = false,
  playingAudioId,
  onAudioPlay,
}: {
  id: string;
  content: string;
  type?: "text" | "audio";
  audioUrl?: string;
  audioDuration?: number;
  timestamp: Date;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  showAvatar?: boolean;
  status?: MessageStatus;
  isGroup?: boolean;
  playingAudioId?: string | null;
  onAudioPlay?: (id: string) => void;
}) {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-fade-in",
        isOwn ? "flex-row-reverse" : ""
      )}
    >
      <div className="flex-shrink-0">
        {showAvatar ? (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
            {senderAvatar || "👤"}
          </div>
        ) : (
          <div className="w-8" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col max-w-lg",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {showAvatar && !isOwn && isGroup && senderName && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {senderName}
          </span>
        )}

        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl",
            isOwn ? "bg-chat-sent text-white" : "bg-secondary text-foreground",
            status === "sending" && "opacity-60"
          )}
        >
          {type === "audio" && audioUrl ? (
            <AudioPlayer
              id={id}
              audioUrl={audioUrl}
              duration={audioDuration}
              isOwn={isOwn}
              playingAudioId={playingAudioId}
              onPlay={onAudioPlay}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
          {isOwn && !isGroup && <MessageStatusIcon status={status} />}
        </div>
      </div>
    </div>
  );
}

// ============= Message Input =============

function MessageInput({
  value,
  onChange,
  onSend,
  onVoiceSend,
  disabled = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onVoiceSend?: (blob: Blob, duration: number) => void;
  disabled?: boolean;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const startTimeRef = useRef<number>(0);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const duration = Math.max(
          1,
          Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
        const blob = new Blob(chunks, { type: "audio/webm" });
        onVoiceSend?.(blob, duration);
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTime(0);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      const timer = setInterval(() => {
        setRecordingTime(
          Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
      }, 1000);

      recorder.addEventListener("stop", () => clearInterval(timer));
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isRecording) {
    return (
      <div className="p-4 bg-chat-header border-t border-border flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={cancelRecording}
            className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-destructive"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm text-foreground font-medium">
              Recording... {formatTime(recordingTime)}
            </span>
          </div>

          <button
            onClick={stopRecording}
            className="p-3 bg-primary hover:bg-primary/90 rounded-full transition-colors"
          >
            <Square className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-chat-header border-t border-border flex-shrink-0">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <button className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Paperclip className="w-5 h-5" />
        </button>

        {onVoiceSend && (
          <button
            onClick={startRecording}
            className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={disabled}
          className={cn(
            "flex-1 bg-chat-message text-background rounded-full px-5 py-3 text-sm",
            "placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        <button className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Smile className="w-5 h-5" />
        </button>

        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className={cn(
            "p-3 rounded-full transition-colors",
            value.trim()
              ? "bg-primary hover:bg-primary/90"
              : "bg-muted cursor-not-allowed"
          )}
        >
          <Send
            className={cn(
              "w-5 h-5",
              value.trim() ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
        </button>
      </div>
    </div>
  );
}

// ============= Chat Header =============

function ChatHeader({
  name,
  avatar = "👤",
  isOnline = false,
  isGroup = false,
  participantCount,
}: {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  isGroup?: boolean;
  participantCount?: number;
}) {
  return (
    <div className="h-16 bg-chat-header flex items-center justify-between px-6 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-xl">
            {isGroup ? <Users className="w-5 h-5 text-primary" /> : avatar}
          </div>
          {!isGroup && isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-chat-online rounded-full border-2 border-chat-header" />
          )}
        </div>
        <div>
          <h2 className="font-semibold text-sm text-foreground">{name}</h2>
          <p className="text-xs flex items-center gap-1.5">
            {isGroup ? (
              <span className="text-muted-foreground">
                {participantCount} participants
              </span>
            ) : isOnline ? (
              <>
                <Circle className="w-2 h-2 fill-chat-online text-chat-online" />
                <span className="text-chat-online">Active now</span>
              </>
            ) : (
              <span className="text-muted-foreground">Offline</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Phone className="w-5 h-5" />
        </button>
        <button className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Video className="w-5 h-5" />
        </button>
        <button className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Search className="w-5 h-5" />
        </button>
        <button className="p-2.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ============= User List Item =============

function UserListItem({
  user,
  isSelected,
  onClick,
  unreadCount,
}: {
  user: User;
  isSelected: boolean;
  onClick: () => void;
  unreadCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all animate-slide-in-left",
        isSelected ? "bg-secondary" : "hover:bg-secondary/50"
      )}
    >
      <div className="relative">
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-lg">
          {user.avatar}
        </div>
        {user.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-chat-online rounded-full border-2 border-sidebar" />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-sm text-foreground">{user.name}</p>
        <p className="text-xs text-muted-foreground">
          {user.isOnline ? "Active now" : user.lastActive || "Offline"}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

// ============= Chat Sidebar =============

function ChatSidebar({
  moduleUsers,
  moduleGroups,
  selectedUserId,
  selectedGroupId,
  activeTab,
  onTabChange,
  onUserClick,
  onGroupClick,
  searchQuery,
  onSearchChange,
  unreadCounts,
  modules,
  selectedModule,
  onModuleChange,
  loadingModules,
  loadingUsers,
  onLogout,
}: {
  moduleUsers: User[];
  moduleGroups: ModuleGroup[];
  selectedUserId?: string;
  selectedGroupId?: string;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onUserClick: (user: User) => void;
  onGroupClick: (group: ModuleGroup) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unreadCounts: Map<string, number>;
  modules: Module[];
  selectedModule: Module | null;
  onModuleChange: (module: Module) => void;
  loadingModules: boolean;
  loadingUsers: boolean;
  onLogout: () => void;
}) {
  const teachers = moduleUsers.filter((u) => u.role === "teacher");

  const filteredUsers = moduleUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = moduleGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.moduleCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-sidebar flex flex-col h-full border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-primary-foreground">
            Y
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Yazait</p>
            <p className="text-xs text-muted-foreground">Learn, grow</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Module Selector */}
      <div className="px-4 py-3 border-b border-border">
        {loadingModules ? (
          <div className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg text-sm text-center">
            Loading...
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedModule?.id || ""}
              onChange={(e) => {
                const module = modules.find((m) => m.id === e.target.value);
                if (module) onModuleChange(module);
              }}
              className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg text-sm font-medium appearance-none cursor-pointer hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground w-4 h-4" />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-secondary rounded-full pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="px-4 space-y-1">
        <button
          onClick={() => onTabChange("groups")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            activeTab === "groups"
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary text-foreground"
          )}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium text-sm">Groups</span>
          {moduleGroups.length > 0 && (
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {moduleGroups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange("teachers")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            activeTab === "teachers"
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary text-foreground"
          )}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-sm">Teachers</span>
          {teachers.length > 0 && (
            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {teachers.filter((t) => t.isOnline).length} online
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            activeTab === "settings"
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary text-foreground"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm">Settings</span>
        </button>
      </nav>

      {/* Content based on active tab */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 mt-4">
        {loadingUsers ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            Loading...
          </div>
        ) : (
          <>
            {activeTab === "groups" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1">
                  <Users className="w-3 h-3" />
                  <span className="uppercase font-medium">Module Groups</span>
                </div>
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => onGroupClick(group)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all animate-slide-in-left",
                      selectedGroupId === group.id
                        ? "bg-secondary"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm text-foreground">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.moduleCode}
                      </p>
                    </div>
                    {(group.unreadCount ?? 0) > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {group.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                {filteredGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No groups found
                  </p>
                )}
              </div>
            )}

            {activeTab === "teachers" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1">
                  <GraduationCap className="w-3 h-3" />
                  <span className="uppercase font-medium">Available Teachers</span>
                </div>
                {teachers.map((teacher) => (
                  <UserListItem
                    key={teacher.id}
                    user={teacher}
                    isSelected={selectedUserId === teacher.id}
                    onClick={() => onUserClick(teacher)}
                    unreadCount={unreadCounts.get(teacher.id) || 0}
                  />
                ))}
                {teachers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No teachers available
                  </p>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="py-4 text-center text-muted-foreground text-sm">
                Settings coming soon
              </div>
            )}

            {/* Online Now Section */}
            {activeTab !== "settings" && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1">
                  <Circle className="w-3 h-3 fill-chat-online text-chat-online" />
                  <span className="uppercase font-medium">Online Now</span>
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </div>
                <div className="space-y-1">
                  {filteredUsers
                    .filter(
                      (u) =>
                        u.isOnline &&
                        (activeTab === "groups" ? u.role === "student" : true)
                    )
                    .map((user) => (
                      <UserListItem
                        key={user.id}
                        user={user}
                        isSelected={selectedUserId === user.id}
                        onClick={() => onUserClick(user)}
                        unreadCount={unreadCounts.get(user.id) || 0}
                      />
                    ))}
                  {filteredUsers.filter((u) => u.isOnline).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No users online
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <p className="text-center text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-primary">Rasta Kadema</span>
        </p>
      </div>
    </div>
  );
}

// ============= Chat Area =============

function ChatArea({
  currentUserId,
  selectedRoom,
  messages,
  users,
  messageInput,
  typingIndicator,
  playingAudioId,
  onMessageChange,
  onSendMessage,
  onVoiceSend,
  onAudioPlay,
}: {
  currentUserId: string;
  selectedRoom: ChatRoom | null;
  messages: Message[];
  users: Map<string, User>;
  messageInput: string;
  typingIndicator: string | null;
  playingAudioId: string | null;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onVoiceSend?: (blob: Blob, duration: number) => void;
  onAudioPlay: (id: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedRoom) {
    return <EmptyState type="no-chat" />;
  }

  const isGroup = selectedRoom.type === "group";
  const otherUserId = selectedRoom.participants.find(
    (p) => p !== currentUserId
  );
  const otherUser = otherUserId ? users.get(otherUserId) : undefined;

  const getHeaderInfo = () => {
    if (isGroup) {
      return {
        name: selectedRoom.name,
        isOnline: false,
        isGroup: true,
        participantCount: selectedRoom.participants.length,
      };
    }
    return {
      name: otherUser?.name || selectedRoom.name,
      avatar: otherUser?.avatar,
      isOnline: otherUser?.isOnline || false,
      isGroup: false,
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex-1 flex flex-col">
      <ChatHeader {...headerInfo} />

      <div className="flex-1 overflow-y-auto p-6 bg-chat-message scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState type="no-messages" />
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="text-center text-xs text-muted-foreground my-4">
              Today
            </div>

            {messages.map((message, index) => {
              const sender = users.get(message.senderId);
              const isOwn = message.senderId === currentUserId;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showAvatar =
                !prevMessage || prevMessage.senderId !== message.senderId;

              const getStatus = () => {
                if (!isOwn || isGroup) return message.status;
                const isRead = message.readBy && message.readBy.length > 1;
                const isDelivered =
                  message.deliveredTo && message.deliveredTo.length > 0;
                if (isRead) return "read";
                if (isDelivered) return "delivered";
                return message.status;
              };

              return (
                <MessageBubble
                  key={message.clientMessageId || message.id}
                  id={message.id}
                  content={message.content}
                  type={message.type}
                  audioUrl={message.audioUrl}
                  audioDuration={message.audioDuration}
                  timestamp={message.timestamp}
                  isOwn={isOwn}
                  senderName={sender?.name}
                  senderAvatar={sender?.avatar}
                  showAvatar={showAvatar}
                  status={getStatus()}
                  isGroup={isGroup}
                  playingAudioId={playingAudioId}
                  onAudioPlay={onAudioPlay}
                />
              );
            })}

            {typingIndicator && <TypingIndicator userName={typingIndicator} />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        value={messageInput}
        onChange={onMessageChange}
        onSend={onSendMessage}
        onVoiceSend={onVoiceSend}
      />
    </div>
  );
}

// ============= Main Component =============

export default function LearningPlatformChat({
  currentUser: propCurrentUser,
  onLogout,
}: LearningPlatformChatProps) {
  const currentUser: User = useMemo(
    () => ({
      id: propCurrentUser.id,
      name: propCurrentUser.name,
      role: propCurrentUser.role,
      subscription: propCurrentUser.subscription,
      avatar: propCurrentUser.avatar || "👤",
      isOnline: true,
    }),
    [propCurrentUser]
  );

  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [messageInput, setMessageInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [moduleUsers, setModuleUsers] = useState<User[]>([]);
  const [moduleGroups, setModuleGroups] = useState<ModuleGroup[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>("groups");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch modules on mount
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await moduleAPI.getMyModules();
        setModules(data);
        if (data.length > 0) {
          setSelectedModule(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch modules:", error);
      } finally {
        setLoadingModules(false);
      }
    };
    fetchModules();
  }, []);

  // Fetch module users AND groups when module is selected
  useEffect(() => {
    if (!selectedModule) return;

    const fetchModuleData = async () => {
      setLoadingUsers(true);
      try {
        // Fetch users
        const users = await moduleAPI.getModuleUsers(selectedModule.id);
        const filteredUsers = users.filter((user: any) => user.id !== currentUser.id);
        setModuleUsers(
          filteredUsers.map((user: any) => ({
            id: user.id,
            name: user.name,
            role: user.role,
            subscription: user.subscription,
            avatar: user.avatar || "👤",
            isOnline: user.isOnline || false,
          }))
        );

        // Fetch groups
        const groups = await chatAPI.getModuleGroups();
        const moduleGroup = groups.find(
          (g: any) => g.module_id === selectedModule.id
        );
        setModuleGroups(
          moduleGroup
            ? [
                {
                  id: moduleGroup.id,
                  name: moduleGroup.name,
                  moduleCode: selectedModule.code,
                  module_id: moduleGroup.module_id,
                  unreadCount: 0,
                },
              ]
            : []
        );
      } catch (error) {
        console.error("Failed to fetch module data:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchModuleData();
  }, [selectedModule, currentUser.id]);

  // Join module when selected
  useEffect(() => {
    if (selectedModule) {
      socketService.joinModule(selectedModule.id);
    }
  }, [selectedModule]);

  // Clear selected room when module changes
  useEffect(() => {
    setSelectedRoom(null);
  }, [selectedModule?.id]);

  // Socket listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    if (socket.hasListeners("user_presence_changed")) return;

    const handleNewMessage = (message: any) => {
      setMessages((prev) => {
        const roomMessages = prev.get(message.roomId) || [];
        const exists = roomMessages.some(
          (m) =>
            m.id === message.id ||
            (m.clientMessageId && m.clientMessageId === message.clientMessageId)
        );

        if (exists) {
          return new Map(prev).set(
            message.roomId,
            roomMessages.map((m) =>
              m.clientMessageId === message.clientMessageId
                ? {
                    ...m,
                    id: message.id,
                    status: "sent" as MessageStatus,
                    timestamp: new Date(message.timestamp),
                  }
                : m
            )
          );
        }

        return new Map(prev).set(message.roomId, [
          ...roomMessages,
          {
            id: message.id,
            roomId: message.roomId,
            senderId: message.senderId,
            content: message.content,
            type: message.type || "text",
            audioUrl: message.audioUrl,
            audioDuration: message.audioDuration,
            timestamp: new Date(message.timestamp),
            status: "delivered" as MessageStatus,
            readBy: message.readBy || [message.senderId],
            deliveredTo: message.deliveredTo || [],
          },
        ]);
      });
    };

    const handleNewMessageNotification = ({ roomId, message }: any) => {
      setMessages((prev) => {
        const roomMessages = prev.get(roomId) || [];
        const exists = roomMessages.some((m) => m.id === message.id);
        if (!exists) {
          return new Map(prev).set(roomId, [
            ...roomMessages,
            {
              ...message,
              timestamp: new Date(message.timestamp),
              type: message.type || "text",
            },
          ]);
        }
        return prev;
      });

      if (message.senderId && message.senderId !== currentUser.id) {
        setUnreadCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(message.senderId, (newMap.get(message.senderId) || 0) + 1);
          return newMap;
        });
      }
    };

    const handleStatusUpdate = ({ roomId, userId, status }: any) => {
      setMessages((prev) => {
        const newMap = new Map(prev);
        const roomMessages = newMap.get(roomId) || [];

        const updated = roomMessages.map((msg) => {
          if (msg.senderId === currentUser.id) {
            if (status === "delivered" && !msg.deliveredTo?.includes(userId)) {
              return {
                ...msg,
                status: "delivered" as MessageStatus,
                deliveredTo: [...(msg.deliveredTo || []), userId],
              };
            }
            if (status === "read" && !msg.readBy?.includes(userId)) {
              return {
                ...msg,
                status: "read" as MessageStatus,
                readBy: [...(msg.readBy || []), userId],
              };
            }
          }
          return msg;
        });

        newMap.set(roomId, updated);
        return newMap;
      });
    };

    const handlePresenceChanged = ({ userId, isOnline }: any) => {
      setModuleUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, isOnline } : user))
      );
    };

    const handleUserTyping = ({ userId, roomId, isTyping }: any) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const roomTyping = newMap.get(roomId) || new Set();
        isTyping ? roomTyping.add(userId) : roomTyping.delete(userId);
        newMap.set(roomId, roomTyping);
        return newMap;
      });

      if (isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            const roomTyping = newMap.get(roomId);
            if (roomTyping) {
              roomTyping.delete(userId);
              newMap.set(roomId, roomTyping);
            }
            return newMap;
          });
        }, 3000);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("new_message_notification", handleNewMessageNotification);
    socket.on("messages_status_update", handleStatusUpdate);
    socket.on("user_presence_changed", handlePresenceChanged);
    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("new_message_notification", handleNewMessageNotification);
      socket.off("messages_status_update", handleStatusUpdate);
      socket.off("user_presence_changed", handlePresenceChanged);
      socket.off("user_typing", handleUserTyping);
    };
  }, [currentUser.id, socketService]);

  // Join room when selected
  useEffect(() => {
    if (selectedRoom) {
      socketService.joinRoom(selectedRoom.id);

      const markReadTimer = setTimeout(() => {
        socketService
          .getSocket()
          ?.emit("mark_as_read", { roomId: selectedRoom.id });
      }, 1000);

      return () => clearTimeout(markReadTimer);
    }
  }, [selectedRoom, socketService]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedRoom]);

  // Users map for ChatArea
  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    map.set(currentUser.id, currentUser);
    moduleUsers.forEach((user) => map.set(user.id, user));
    return map;
  }, [currentUser, moduleUsers]);

  // Current room messages
  const currentMessages = useMemo(() => {
    if (!selectedRoom) return [];
    return messages.get(selectedRoom.id) || [];
  }, [selectedRoom, messages]);

  // Typing indicator
  const typingIndicator = useMemo(() => {
    if (!selectedRoom) return null;
    const typing = typingUsers.get(selectedRoom.id);
    if (!typing || typing.size === 0) return null;

    const typingUserIds = Array.from(typing).filter(
      (id) => id !== currentUser.id
    );
    if (typingUserIds.length === 0) return null;

    const typingNames = typingUserIds
      .map((id) => moduleUsers.find((u) => u.id === id)?.name?.split(" ")[0])
      .filter(Boolean);

    return typingNames.length === 1
      ? `${typingNames[0]}`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]}`
      : `${typingNames.length} people`;
  }, [selectedRoom, typingUsers, currentUser.id, moduleUsers]);

  // Handlers
  const handleUserClick = useCallback(
    async (clickedUser: User) => {
      if (!selectedModule) return;
      if (clickedUser.id === currentUser.id) return;

      try {
        const room = await chatAPI.getOrCreateRoom(clickedUser.id, selectedModule.id);

        setSelectedRoom({
          id: room.id,
          moduleId: room.module_id,
          type: room.type,
          name: clickedUser.name,
          participants: [currentUser.id, clickedUser.id],
          unreadCount: 0,
        });

        setUnreadCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(clickedUser.id, 0);
          return newMap;
        });

        const history = await chatAPI.getRoomMessages(room.id);
        setMessages((prev) => {
          const newMap = new Map(prev);
          newMap.set(
            room.id,
            history.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              deliveredTo: msg.deliveredTo || [],
              readBy: msg.readBy || [msg.senderId],
              type: msg.type || "text",
            }))
          );
          return newMap;
        });
      } catch (error: any) {
        console.error("Failed to create room:", error);
        alert(error.response?.data?.error || "Failed to create chat");
      }
    },
    [selectedModule, currentUser, chatAPI]
  );

  const handleGroupClick = useCallback(
    async (group: ModuleGroup) => {
      try {
        setSelectedRoom({
          id: group.id,
          moduleId: group.module_id,
          type: "group",
          name: group.name,
          participants: [],
          unreadCount: 0,
        });

        const history = await chatAPI.getRoomMessages(group.id);
        setMessages((prev) => {
          const newMap = new Map(prev);
          newMap.set(
            group.id,
            history.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              deliveredTo: msg.deliveredTo || [],
              readBy: msg.readBy || [msg.senderId],
              type: msg.type || "text",
            }))
          );
          return newMap;
        });
      } catch (error) {
        console.error("Failed to open group:", error);
        alert("Failed to open group chat");
      }
    },
    [chatAPI]
  );

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedRoom || !selectedModule) return;

    const clientMessageId = `client-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const content = messageInput.trim();
    const targetUserId =
      selectedRoom.type === "group"
        ? undefined
        : selectedRoom.participants.find((p) => p !== currentUser.id);

    const optimisticMessage: Message = {
      id: clientMessageId,
      clientMessageId,
      roomId: selectedRoom.id,
      senderId: currentUser.id,
      content,
      type: "text",
      timestamp: new Date(),
      status: "sending",
      readBy: [currentUser.id],
      deliveredTo: [],
    };

    setMessages((prev) => {
      const roomMessages = prev.get(selectedRoom.id) || [];
      return new Map(prev).set(selectedRoom.id, [
        ...roomMessages,
        optimisticMessage,
      ]);
    });

    setMessageInput("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.sendTyping(selectedRoom.id, false);

    socketService.sendMessage({
      roomId: selectedRoom.id,
      content,
      type: "text",
      moduleId: selectedModule.id,
      targetUserId,
      clientMessageId,
    });
  }, [messageInput, selectedRoom, selectedModule, currentUser.id]);

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!selectedRoom || !selectedModule) return;

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");
      formData.append("duration", duration.toString());

      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/voice/upload-voice",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const { audioUrl, duration: audioDuration } = await response.json();

      const clientMessageId = `client-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const targetUserId =
        selectedRoom.type === "group"
          ? undefined
          : selectedRoom.participants.find((p) => p !== currentUser.id);

      const optimisticMessage: Message = {
        id: clientMessageId,
        clientMessageId,
        roomId: selectedRoom.id,
        senderId: currentUser.id,
        content: "Voice message",
        type: "audio",
        audioUrl,
        audioDuration,
        timestamp: new Date(),
        status: "sending",
        readBy: [currentUser.id],
        deliveredTo: [],
      };

      setMessages((prev) => {
        const roomMessages = prev.get(selectedRoom.id) || [];
        return new Map(prev).set(selectedRoom.id, [
          ...roomMessages,
          optimisticMessage,
        ]);
      });

      socketService.sendMessage({
        roomId: selectedRoom.id,
        content: "Voice message",
        type: "audio",
        audioUrl,
        audioDuration,
        moduleId: selectedModule.id,
        targetUserId,
        clientMessageId,
      });
    } catch (error) {
      console.error("Failed to send voice:", error);
      alert("Failed to send voice message");
    }
  };

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessageInput(e.target.value);
      if (!selectedRoom) return;

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketService.sendTyping(selectedRoom.id, true);
      typingTimeoutRef.current = setTimeout(
        () => socketService.sendTyping(selectedRoom.id, false),
        2000
      );
    },
    [selectedRoom]
  );


  if (loadingModules) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        moduleUsers={moduleUsers}
        moduleGroups={moduleGroups}
        selectedUserId={
          selectedRoom?.type === "one_to_one"
            ? selectedRoom.participants.find((p) => p !== currentUser.id)
            : undefined
        }
        selectedGroupId={
          selectedRoom?.type === "group" ? selectedRoom.id : undefined
        }
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUserClick={handleUserClick}
        onGroupClick={handleGroupClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCounts={unreadCounts}
        modules={modules}
        selectedModule={selectedModule}
        onModuleChange={setSelectedModule}
        loadingModules={loadingModules}
        loadingUsers={loadingUsers}
        onLogout={onLogout}
      />

      <ChatArea
        currentUserId={currentUser.id}
        selectedRoom={selectedRoom}
        messages={currentMessages}
        users={usersMap}
        messageInput={messageInput}
        typingIndicator={typingIndicator}
        playingAudioId={playingAudio}
        onMessageChange={handleTyping}
        onSendMessage={handleSendMessage}
        onVoiceSend={handleVoiceSend}
        onAudioPlay={setPlayingAudio}
      />
    </div>
  );
}
