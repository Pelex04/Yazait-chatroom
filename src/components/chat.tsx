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
import { MessageCircle, Users, Send, ChevronDown, LogOut, Mic, ArrowLeft } from "lucide-react";
import socketService from "../services/socket";
import { chatAPI, moduleAPI } from "../services/api";
import VoiceRecorder from './VoiceRecorder';

type UserRole = "student" | "teacher";
type SubscriptionTier = "basic" | "premium";
type ChatType = "one_to_one" | "group";
type MessageStatus = "sending" | "sent" | "delivered" | "read";

interface User {
  id: string;
  name: string;
  role: UserRole;
  subscription: SubscriptionTier;
  avatar: string;
  isOnline: boolean;
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
  type?: 'text' | 'audio';
  audioUrl?: string;
  audioDuration?: number;
  timestamp: Date;
  status: MessageStatus;
  readBy: string[];
  deliveredTo: string[];
}

interface ChatRoom {
  id: string;
  moduleId: string;
  type: ChatType;
  name: string;
  participants: string[];
  unreadCount: number;
}

interface LearningPlatformChatProps {
  currentUser: any;
  onLogout: () => void;
}

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
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [moduleUsers, setModuleUsers] = useState<User[]>([]);
  const [moduleGroups, setModuleGroups] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log("🧑 Current User:", currentUser);

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

  useEffect(() => {
    if (!selectedModule) return;

    const fetchModuleData = async () => {
      setLoadingUsers(true);
      try {
        const users = await moduleAPI.getModuleUsers(selectedModule.id);
        const filteredUsers = users.filter((user: any) => user.id !== currentUser?.id);
        console.log("👥 Module users:", filteredUsers);
        setModuleUsers(filteredUsers);

        const groups = await chatAPI.getModuleGroups();
        const moduleGroup = groups.find((g: any) => g.module_id === selectedModule.id);
        setModuleGroups(moduleGroup ? [moduleGroup] : []);
        console.log("👥 Module group:", moduleGroup);

      } catch (error) {
        console.error("Failed to fetch module data:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchModuleData();
  }, [selectedModule]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      console.error("❌ No socket connection");
      return;
    }

    console.log("🔌 Setting up socket listeners");

    if (socket.hasListeners('user_presence_changed')) {
      console.log("⚠️ Listeners already attached, skipping");
      return;
    }

    const handleNewMessage = (message: any) => {
      console.log("📨 New message:", message);
      setMessages((prev) => {
        const roomMessages = prev.get(message.roomId) || [];
        const exists = roomMessages.some(
          (m) => m.id === message.id || (m.clientMessageId && m.clientMessageId === message.clientMessageId)
        );

        if (exists) {
          return new Map(prev).set(
            message.roomId,
            roomMessages.map((m) =>
              m.clientMessageId === message.clientMessageId
                ? { ...m, id: message.id, status: "sent" as MessageStatus, timestamp: new Date(message.timestamp) }
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
            type: message.type || 'text',
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
      console.log("🔔 Notification for room:", roomId);
      setMessages((prev) => {
        const roomMessages = prev.get(roomId) || [];
        const exists = roomMessages.some((m) => m.id === message.id);
        if (!exists) {
          return new Map(prev).set(roomId, [
            ...roomMessages,
            {
              ...message,
              timestamp: new Date(message.timestamp),
              type: message.type || 'text'
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
      console.log(`✅ Status update: Room=${roomId}, User=${userId}, Status=${status}`);

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
      console.log(`🟢 User ${userId} is now ${isOnline ? "ONLINE" : "OFFLINE"}`);

      setModuleUsers((prev) => {
        const updated = prev.map((user) =>
          user.id === userId ? { ...user, isOnline } : user
        );
        return updated;
      });
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

    console.log("✅ All listeners attached");

    return () => {
      console.log("🧹 Component unmounting - removing listeners");
      socket.off("new_message", handleNewMessage);
      socket.off("new_message_notification", handleNewMessageNotification);
      socket.off("messages_status_update", handleStatusUpdate);
      socket.off("user_presence_changed", handlePresenceChanged);
      socket.off("user_typing", handleUserTyping);
    };
  }, []);

  useEffect(() => {
    if (selectedModule) {
      console.log("📍 Joining module:", selectedModule.id);
      socketService.joinModule(selectedModule.id);
    }
  }, [selectedModule]);

  useEffect(() => {
    if (selectedRoom) {
      console.log("📍 Joining room:", selectedRoom.id);
      socketService.joinRoom(selectedRoom.id);

      const markReadTimer = setTimeout(() => {
        console.log(`📖 Marking room ${selectedRoom.id} as read`);
        socketService.getSocket()?.emit("mark_as_read", { roomId: selectedRoom.id });
      }, 1000);

      return () => clearTimeout(markReadTimer);
    }
  }, [selectedRoom]);

  useEffect(() => {
    setSelectedRoom(null);
    setShowMobileChat(false);
  }, [selectedModule?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedRoom]);

  const filteredModuleUsers = useMemo(() => {
    const students = moduleUsers.filter((u) => u.role === "student");
    const teachers = moduleUsers.filter((u) => u.role === "teacher");

    if (currentUser.subscription === "basic" && currentUser.role === "student") {
      return { students, teachers: [] };
    }

    return { students, teachers };
  }, [moduleUsers, currentUser]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedRoom || !selectedModule) return;

    const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const content = messageInput.trim();

    const targetUserId = selectedRoom.type === 'group'
      ? undefined
      : selectedRoom.participants.find((p) => p !== currentUser.id);

    const optimisticMessage: Message = {
      id: clientMessageId,
      clientMessageId,
      roomId: selectedRoom.id,
      senderId: currentUser.id,
      content,
      type: 'text',
      timestamp: new Date(),
      status: "sending",
      readBy: [currentUser.id],
      deliveredTo: [],
    };

    setMessages((prev) => {
      const roomMessages = prev.get(selectedRoom.id) || [];
      return new Map(prev).set(selectedRoom.id, [...roomMessages, optimisticMessage]);
    });

    setMessageInput("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.sendTyping(selectedRoom.id, false);

    socketService.sendMessage({
      roomId: selectedRoom.id,
      content,
      type: 'text',
      moduleId: selectedModule.id,
      targetUserId,
      clientMessageId,
    });
  }, [messageInput, selectedRoom, selectedModule, currentUser.id]);

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!selectedRoom || !selectedModule) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('duration', duration.toString());

      const token = localStorage.getItem('token');
      const response = await fetch('https://chatroom-0u60.onrender.com/api/voice/upload-voice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { audioUrl, duration: audioDuration } = await response.json();

      const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const targetUserId = selectedRoom.type === 'group'
        ? undefined
        : selectedRoom.participants.find((p) => p !== currentUser.id);

      const optimisticMessage: Message = {
        id: clientMessageId,
        clientMessageId,
        roomId: selectedRoom.id,
        senderId: currentUser.id,
        content: 'Voice message',
        type: 'audio',
        audioUrl,
        audioDuration,
        timestamp: new Date(),
        status: "sending",
        readBy: [currentUser.id],
        deliveredTo: [],
      };

      setMessages((prev) => {
        const roomMessages = prev.get(selectedRoom.id) || [];
        return new Map(prev).set(selectedRoom.id, [...roomMessages, optimisticMessage]);
      });

      socketService.sendMessage({
        roomId: selectedRoom.id,
        content: 'Voice message',
        type: 'audio',
        audioUrl,
        audioDuration,
        moduleId: selectedModule.id,
        targetUserId,
        clientMessageId,
      });

      setShowVoiceRecorder(false);
      console.log('✅ Voice message sent');

    } catch (error) {
      console.error('❌ Failed to send voice:', error);
      alert('Failed to send voice message');
    }
  };

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessageInput(e.target.value);
      if (!selectedRoom) return;

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketService.sendTyping(selectedRoom.id, true);
      typingTimeoutRef.current = setTimeout(() => socketService.sendTyping(selectedRoom.id, false), 2000);
    },
    [selectedRoom]
  );

  const handleUserClick = useCallback(
    async (clickedUser: User) => {
      if (!selectedModule) return;

      if (clickedUser.id === currentUser.id) {
        alert("Cannot chat with yourself!");
        return;
      }

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

        setShowMobileChat(true);

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
              type: msg.type || 'text',
            }))
          );
          return newMap;
        });
      } catch (error: any) {
        console.error("❌ Failed to create room:", error.response?.data || error.message);
        alert(error.response?.data?.error || "Failed to create chat");
      }
    },
    [selectedModule, currentUser]
  );

  const handleGroupClick = useCallback(
    async (group: any) => {
      try {
        console.log("📂 Opening group chat:", group);

        setSelectedRoom({
          id: group.id,
          moduleId: group.module_id,
          type: 'group',
          name: group.name,
          participants: [],
          unreadCount: 0,
        });

        setShowMobileChat(true);

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
              type: msg.type || 'text',
            }))
          );
          return newMap;
        });

      } catch (error: any) {
        console.error("❌ Failed to open group:", error);
        alert("Failed to open group chat");
      }
    },
    []
  );

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedRoom(null);
  };

  const getRoomMessages = useCallback((roomId: string) => messages.get(roomId) || [], [messages]);

  const getTypingIndicator = useCallback(
    (roomId: string): string | null => {
      const typing = typingUsers.get(roomId);
      if (!typing || typing.size === 0) return null;

      const typingUserIds = Array.from(typing).filter((id) => id !== currentUser.id);
      if (typingUserIds.length === 0) return null;

      const typingNames = typingUserIds
        .map((id) => moduleUsers.find((u) => u.id === id)?.name?.split(" ")[0])
        .filter(Boolean);

      return typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing...`
        : `${typingNames.length} people are typing...`;
    },
    [typingUsers, currentUser.id, moduleUsers]
  );

  const getUserById = useCallback(
    (userId: string) => {
      if (userId === currentUser.id) return currentUser;
      return moduleUsers.find((u) => u.id === userId);
    },
    [currentUser, moduleUsers]
  );

  const getRoomDisplayName = useCallback(
    (room: ChatRoom) => {
      if (room.type === "group") return room.name;
      const otherUser = room.participants.find((p) => p !== currentUser.id);
      return getUserById(otherUser!)?.name || "Unknown";
    },
    [currentUser.id, getUserById]
  );

  const getRoomIcon = useCallback(
    (room: ChatRoom) => {
      if (room.type === "group") return "👥";
      const otherUser = room.participants.find((p) => p !== currentUser.id);
      return getUserById(otherUser!)?.avatar || "👤";
    },
    [currentUser.id, getUserById]
  );

  const VoiceMessage = ({ message }: { message: Message }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
      if (!audioRef.current) return;

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setPlayingAudio(message.id);
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    useEffect(() => {
      if (playingAudio !== message.id && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, [playingAudio, message.id]);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="flex items-center gap-2 sm:gap-3 min-w-[180px] sm:min-w-[200px]">
        <button
          onClick={togglePlay}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all flex-shrink-0"
        >
          {isPlaying ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4l10 6-10 6V4z"/>
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(currentTime / (message.audioDuration || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-xs opacity-75 mt-1">
            {formatTime(currentTime)} / {formatTime(message.audioDuration || 0)}
          </div>
        </div>

        <audio
          ref={audioRef}
          src={`https://chatroom-0u60.onrender.com${message.audioUrl}`}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          className="hidden"
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex-col`}>
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <div className="flex items-center justify-between text-white mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="sm:w-6 sm:h-6" />
              <h1 className="text-base sm:text-lg font-semibold">YazaIt</h1>
            </div>
            <button onClick={onLogout} className="hover:bg-blue-800 p-1.5 rounded-lg transition-colors">
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          <div className="relative">
            {loadingModules ? (
              <div className="w-full bg-blue-800 text-white px-3 py-2 rounded-lg text-sm text-center">Loading...</div>
            ) : (
              <>
                <select
                  value={selectedModule?.id || ""}
                  onChange={(e) => setSelectedModule(modules.find((m) => m.id === e.target.value) || null)}
                  className="w-full bg-blue-800 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium appearance-none cursor-pointer hover:bg-blue-900 transition-colors"
                >
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.code} - {module.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-white" size={16} />
              </>
            )}
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
            <h2 className="font-semibold text-sm">Chats</h2>
          </div>

          {loadingUsers ? (
            <div className="text-center text-gray-400 text-sm py-4">Loading...</div>
          ) : (
            <>
              {moduleGroups.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
                    Groups
                  </div>
                  {moduleGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupClick(group)}
                      className="w-full flex items-center gap-2 sm:gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="text-xl sm:text-2xl flex-shrink-0">👥</div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600 truncate">
                          {group.name}
                        </div>
                        <div className="text-xs text-gray-500">Group Chat</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
                  Students ({filteredModuleUsers.students.length})
                </div>
                {filteredModuleUsers.students.map((user) => {
                  const unreadCount = unreadCounts.get(user.id) || 0;

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user)}
                      className="w-full flex items-center gap-2 sm:gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="text-xl sm:text-2xl">{user.avatar}</div>
                        {user.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.subscription}</div>
                      </div>

                      {unreadCount > 0 && (
                        <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center flex-shrink-0">
                          {unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredModuleUsers.teachers.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
                    Teachers ({filteredModuleUsers.teachers.length})
                  </div>
                  {filteredModuleUsers.teachers.map((user) => {
                    const unreadCount = unreadCounts.get(user.id) || 0;

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="w-full flex items-center gap-2 sm:gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="text-xl sm:text-2xl">{user.avatar}</div>
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600 truncate">{user.name}</div>
                          <div className="text-xs text-gray-500">Teacher</div>
                        </div>

                        {unreadCount > 0 && (
                          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center flex-shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {selectedRoom ? (
          <>
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="text-2xl sm:text-3xl flex-shrink-0">{getRoomIcon(selectedRoom)}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{getRoomDisplayName(selectedRoom)}</h2>
                  <div className="text-xs text-gray-500">
                    {selectedRoom.type === 'group' ? (
                      <span>Group Chat</span>
                    ) : (
                      (() => {
                        const otherUser = getUserById(selectedRoom.participants.find((p) => p !== currentUser.id)!);
                        return otherUser?.isOnline ? (
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Online
                          </span>
                        ) : (
                          <span>Offline</span>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50">
              {getRoomMessages(selectedRoom.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle size={40} className="sm:w-12 sm:h-12 mb-4" />
                  <p className="text-base sm:text-lg font-medium">No messages yet</p>
                  <p className="text-xs sm:text-sm">Start the conversation!</p>
                </div>
              ) : (
                <>
                  {getRoomMessages(selectedRoom.id).map((message, index) => {
                    const sender = getUserById(message.senderId);
                    const isCurrentUser = message.senderId === currentUser.id;
                    const prevMessage = index > 0 ? getRoomMessages(selectedRoom.id)[index - 1] : null;
                    const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;

                    const getStatusIcon = (message: Message) => {
                      if (message.senderId !== currentUser.id) return null;
                      if (selectedRoom.type === 'group') return null;

                      const isRead = message.readBy && message.readBy.length > 1;
                      const isDelivered = message.deliveredTo && message.deliveredTo.length > 0;

                      if (isRead) {
                        return (
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 8l2-2 3 3 7-7 2 2-9 9z" />
                            <path d="M5 8l2-2 3 3 7-7 2 2-9 9z" opacity="0.6" />
                          </svg>
                        );
                      } else if (isDelivered) {
                        return (
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 8l2-2 3 3 7-7 2 2-9 9z" />
                            <path d="M5 8l2-2 3 3 7-7 2 2-9 9z" opacity="0.6" />
                          </svg>
                        );
                      } else {
                        return (
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 8l2-2 3 3 7-7 2 2-9 9z" />
                          </svg>
                        );
                      }
                    };

                    return (
                      <div
                        key={message.clientMessageId || message.id}
                        className={`flex gap-2 sm:gap-3 mb-3 sm:mb-4 ${isCurrentUser ? "flex-row-reverse" : ""}`}
                      >
                        <div className="flex-shrink-0">
                          {showAvatar ? (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl">{sender?.avatar}</div>
                          ) : (
                            <div className="w-7 sm:w-8"></div>
                          )}
                        </div>
                        <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%] sm:max-w-md lg:max-w-lg min-w-0`}>
                          {showAvatar && !isCurrentUser && (
                            <div className="text-xs font-medium text-gray-700 mb-1 px-1">{sender?.name}</div>
                          )}
                          <div
                            className={`px-3 sm:px-4 py-2 rounded-2xl ${
                              isCurrentUser
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-900 border border-gray-200"
                            } ${message.status === "sending" ? "opacity-60" : ""} break-words`}
                          >
                            {message.type === 'audio' ? (
                              <VoiceMessage message={message} />
                            ) : (
                              <span className="text-sm sm:text-base">{message.content}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 px-1">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {getStatusIcon(message)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}

              {getTypingIndicator(selectedRoom.id) && (
                <div className="flex gap-2 sm:gap-3 items-center mb-4">
                  <div className="w-7 sm:w-8"></div>
                  <div className="bg-white px-3 sm:px-4 py-2 rounded-2xl border border-gray-200">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 italic hidden sm:inline">{getTypingIndicator(selectedRoom.id)}</span>
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 p-2 sm:p-3 md:p-4 flex-shrink-0">
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-0"
                />

                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0"
                  title="Send voice message"
                >
                  <Mic size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="px-3 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1 sm:gap-2 font-medium flex-shrink-0"
                >
                  <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline text-sm sm:text-base">Send</span>
                </button>
              </div>
            </div>

            {showVoiceRecorder && (
              <VoiceRecorder
                onSend={handleVoiceSend}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4">
            <MessageCircle size={48} className="sm:w-16 sm:h-16 mb-4" />
            <p className="text-lg sm:text-xl font-medium text-center">Select a chat to start messaging</p>
            <p className="text-xs sm:text-sm mt-2 text-center">Click on a contact or group to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
