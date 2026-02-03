/* eslint-disable @typescript-eslint/no-unused-vars */
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
  MessageCircle,
  Users,
  Send,
  ChevronDown,
  LogOut,
  Mic,
  ArrowLeft,
  Reply,
  Trash2,
  X,
  MoreVertical,
  Trash,
  Paperclip,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Search,
  Phone,
  VideoIcon,
  //Info,
  CheckCheck,
  Check,
} from "lucide-react";
import socketService from "../services/socket";
import { chatAPI, moduleAPI } from "../services/api";
import VoiceRecorder from "./VoiceRecorder";

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

interface TaggedMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "audio" | "attachment";
}

interface AttachmentPreview {
  file: File;
  preview?: string;
  uploading: boolean;
  error?: string;
}

interface Message {
  id: string;
  clientMessageId?: string;
  roomId: string;
  senderId: string;
  content: string;
  type?: "text" | "audio" | "attachment";
  audioUrl?: string;
  audioDuration?: number;
  attachment?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
  };
  timestamp: Date;
  status: MessageStatus;
  readBy: string[];
  deliveredTo: string[];
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  deletedAt?: Date;
  taggedMessage?: TaggedMessage;
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
    [propCurrentUser],
  );

  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [messageInput, setMessageInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(
    new Map(),
  );
  const [moduleUsers, setModuleUsers] = useState<User[]>([]);
  const [moduleGroups, setModuleGroups] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreview | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<TaggedMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await moduleAPI.getMyModules();
        setModules(data);
        if (data.length > 0) {
          setSelectedModule(data[0]);
        }
      } catch (error: any) {
        alert("Failed to fetch modules:");
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
        const filteredUsers = users.filter(
          (user: any) => user.id !== currentUser?.id,
        );

        setModuleUsers(filteredUsers);

        const groups = await chatAPI.getModuleGroups();
        const moduleGroup = groups.find(
          (g: any) => g.module_id === selectedModule.id,
        );
        setModuleGroups(moduleGroup ? [moduleGroup] : []);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchModuleData();
  }, [selectedModule]);

  useEffect(() => {
    const handleClickOutside = () => setShowChatMenu(false);
    if (showChatMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showChatMenu]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    if (socket.hasListeners("user_presence_changed")) return;

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
              deletedFor: message.deletedFor || [],
              deletedForEveryone: message.deletedForEveryone || false,
              taggedMessage: message.taggedMessage || null,
            },
          ]);
        }
        return prev;
      });

      if (message.senderId !== currentUser.id) {
        setUnreadCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(roomId, (newMap.get(roomId) || 0) + 1);
          return newMap;
        });
      }
    };

    const handleNewMessage = (message: any) => {
      setMessages((prev) => {
        const roomMessages = prev.get(message.roomId) || [];
        const exists = roomMessages.some(
          (m) =>
            m.id === message.id ||
            (m.clientMessageId &&
              m.clientMessageId === message.clientMessageId),
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
                    taggedMessage: message.taggedMessage || m.taggedMessage,
                    readBy: message.readBy || m.readBy,
                    deliveredTo: message.deliveredTo || m.deliveredTo,
                  }
                : m,
            ),
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
            status: message.status || ("delivered" as MessageStatus),
            readBy: message.readBy || [message.senderId],
            deliveredTo: message.deliveredTo || [],
            deletedFor: message.deletedFor || [],
            deletedForEveryone: message.deletedForEveryone || false,
            taggedMessage: message.taggedMessage || null,
          },
        ]);
      });

      if (
        selectedRoom &&
        message.roomId === selectedRoom.id &&
        message.senderId !== currentUser.id
      ) {
        setUnreadCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(message.roomId, 0);
          return newMap;
        });
      }
    };

    const handleMessageDeleted = ({
      messageId,
      roomId,
      deletedForEveryone,
      deletedBy,
    }: any) => {
      setMessages((prev) => {
        const newMap = new Map(prev);
        const roomMessages = newMap.get(roomId) || [];

        const updated = roomMessages.map((msg) => {
          if (msg.id === messageId) {
            if (deletedForEveryone) {
              return {
                ...msg,
                deletedForEveryone: true,
                deletedAt: new Date(),
                content: "This message was deleted",
              };
            } else {
              return {
                ...msg,
                deletedFor: [...(msg.deletedFor || []), deletedBy],
              };
            }
          }
          return msg;
        });

        newMap.set(roomId, updated);
        return newMap;
      });
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
      setModuleUsers((prev) => {
        const updated = prev.map((user) =>
          user.id === userId ? { ...user, isOnline } : user,
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

    const handleChatCleared = ({ roomId, success, clearedCount }: any) => {
      if (success) {
        console.log(
          ` Chat cleared: ${clearedCount} messages in room ${roomId}`,
        );
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("new_message_notification", handleNewMessageNotification);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("messages_status_update", handleStatusUpdate);
    socket.on("user_presence_changed", handlePresenceChanged);
    socket.on("user_typing", handleUserTyping);
    socket.on("chat_cleared", handleChatCleared);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("new_message_notification", handleNewMessageNotification);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("messages_status_update", handleStatusUpdate);
      socket.off("user_presence_changed", handlePresenceChanged);
      socket.off("user_typing", handleUserTyping);
      socket.off("chat_cleared", handleChatCleared);
    };
  }, [currentUser.id, selectedRoom?.id]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    if (selectedModule) {
      socketService.joinModule(selectedModule.id);
    }
  }, [selectedModule]);

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

    if (
      currentUser.subscription === "basic" &&
      currentUser.role === "student"
    ) {
      return { students, teachers: [] };
    }

    return { students, teachers };
  }, [moduleUsers, currentUser]);

  const handleSendMessage = useCallback(() => {
    if (attachmentPreview) {
      sendAttachment(messageInput.trim());
      return;
    }

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
      deletedFor: [],
      deletedForEveryone: false,
      taggedMessage: replyingTo || undefined,
    };

    setMessages((prev) => {
      const roomMessages = prev.get(selectedRoom.id) || [];
      return new Map(prev).set(selectedRoom.id, [
        ...roomMessages,
        optimisticMessage,
      ]);
    });

    setMessageInput("");
    setReplyingTo(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.sendTyping(selectedRoom.id, false);

    socketService.sendMessage({
      roomId: selectedRoom.id,
      content,
      type: "text",
      moduleId: selectedModule.id,
      targetUserId,
      clientMessageId,
      taggedMessage: replyingTo || undefined,
    });
  }, [
    messageInput,
    selectedRoom,
    selectedModule,
    currentUser.id,
    replyingTo,
    attachmentPreview,
  ]);

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!selectedRoom || !selectedModule) return;

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");
      formData.append("duration", duration.toString());

      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://chatroom-0u60.onrender.com/api/voice/upload-voice",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
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
        deletedFor: [],
        deletedForEveryone: false,
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

      setShowVoiceRecorder(false);
    } catch (error: any) {
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
        2000,
      );
    },
    [selectedRoom],
  );

  const handleMessageContextMenu = useCallback(
    (e: React.MouseEvent, message: Message) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        message,
      });
    },
    [],
  );

  const handleReply = useCallback((message: Message) => {
    const sender = getUserById(message.senderId);
    setReplyingTo({
      id: message.id,
      senderId: message.senderId,
      senderName: sender?.name || "Unknown",
      content: message.type === "audio" ? "🎤 Voice message" : message.content,
      type: message.type || "text",
    });
    setContextMenu(null);
  }, []);

  const handleDelete = useCallback(
    (message: Message, deleteForEveryone: boolean) => {
      if (!selectedRoom) return;

      socketService.deleteMessage(
        message.id,
        selectedRoom.id,
        deleteForEveryone,
      );
      setContextMenu(null);
    },
    [selectedRoom],
  );

  const handleClearChat = useCallback(() => {
    if (!selectedRoom) return;

    socketService.getSocket()?.emit("clear_chat", { roomId: selectedRoom.id });

    setMessages((prev) => {
      const newMap = new Map(prev);
      newMap.set(selectedRoom.id, []);
      return newMap;
    });

    setShowClearConfirm(false);
    setShowChatMenu(false);
  }, [selectedRoom]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    setAttachmentPreview({
      file,
      preview,
      uploading: false,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendAttachment = async (caption: string = "") => {
    if (!attachmentPreview || !selectedRoom || !selectedModule) return;

    try {
      setAttachmentPreview((prev) =>
        prev ? { ...prev, uploading: true } : null,
      );

      const formData = new FormData();
      formData.append("file", attachmentPreview.file);
      formData.append("roomId", selectedRoom.id);

      const token = localStorage.getItem("token");
      const uploadResponse = await fetch(
        "https://chatroom-0u60.onrender.com/api/attachment/upload-attachment",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Upload failed");
      }

      const attachmentData = await uploadResponse.json();
      const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const optimisticMessage: Message = {
        id: clientMessageId,
        clientMessageId,
        roomId: selectedRoom.id,
        senderId: currentUser.id,
        content: caption,
        type: "attachment",
        attachment: attachmentData,
        timestamp: new Date(),
        status: "sending",
        readBy: [currentUser.id],
        deliveredTo: [],
        deletedFor: [],
        deletedForEveryone: false,
        taggedMessage: replyingTo || undefined,
      };

      setMessages((prev) => {
        const roomMessages = prev.get(selectedRoom.id) || [];
        return new Map(prev).set(selectedRoom.id, [
          ...roomMessages,
          optimisticMessage,
        ]);
      });

      socketService.getSocket()?.emit("send_attachment_message", {
        roomId: selectedRoom.id,
        attachment: attachmentData,
        caption,
        clientMessageId,
        taggedMessage: replyingTo,
      });

      setAttachmentPreview(null);
      setMessageInput("");
      setReplyingTo(null);
    } catch (error: any) {
      console.error("Attachment send error:", error);
      setAttachmentPreview((prev) =>
        prev
          ? {
              ...prev,
              uploading: false,
              error: error.message || "Failed to send attachment",
            }
          : null,
      );
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <ImageIcon className="w-8 h-8" />;
    if (mimetype.startsWith("video/")) return <Video className="w-8 h-8" />;
    if (mimetype.includes("pdf")) return <FileText className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleUserClick = useCallback(
    async (clickedUser: User) => {
      if (!selectedModule) return;

      if (clickedUser.id === currentUser.id) {
        alert("Cannot chat with yourself!");
        return;
      }

      try {
        const room = await chatAPI.getOrCreateRoom(
          clickedUser.id,
          selectedModule.id,
        );

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
          newMap.set(room.id, 0);
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
              deletedFor: msg.deletedFor || [],
              deletedForEveryone: msg.deletedForEveryone || false,
              taggedMessage: msg.taggedMessage || null,
            })),
          );
          return newMap;
        });
      } catch (error: any) {
        alert(error.response?.data?.error || "Failed to create chat");
      }
    },
    [selectedModule, currentUser],
  );

  const handleGroupClick = useCallback(async (group: any) => {
    try {
      setSelectedRoom({
        id: group.id,
        moduleId: group.module_id,
        type: "group",
        name: group.name,
        participants: [],
        unreadCount: 0,
      });

      setShowMobileChat(true);

      setUnreadCounts((prev) => {
        const newMap = new Map(prev);
        newMap.set(group.id, 0);
        return newMap;
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
            deletedFor: msg.deletedFor || [],
            deletedForEveryone: msg.deletedForEveryone || false,
            taggedMessage: msg.taggedMessage || null,
          })),
        );
        return newMap;
      });
    } catch (error: any) {
      alert("Failed to open group chat");
    }
  }, []);

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedRoom(null);
  };

  const getRoomMessages = useCallback(
    (roomId: string) => messages.get(roomId) || [],
    [messages],
  );

  const getTypingIndicator = useCallback(
    (roomId: string): string | null => {
      const typing = typingUsers.get(roomId);
      if (!typing || typing.size === 0) return null;

      const typingUserIds = Array.from(typing).filter(
        (id) => id !== currentUser.id,
      );
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
    [typingUsers, currentUser.id, moduleUsers],
  );

  const getUserById = useCallback(
    (userId: string) => {
      if (userId === currentUser.id) return currentUser;
      return moduleUsers.find((u) => u.id === userId);
    },
    [currentUser, moduleUsers],
  );

  const isStudentTeacherRoom = useCallback((): boolean => {
    if (!selectedRoom || selectedRoom.type !== "one_to_one") return false;

    const otherUserId = selectedRoom.participants.find(
      (p) => p !== currentUser.id,
    );
    if (!otherUserId) return false;

    const otherUser = getUserById(otherUserId);
    if (!otherUser) return false;

    const isCurrentUserStudent = currentUser.role === "student";
    const isCurrentUserTeacher = currentUser.role === "teacher";
    const isOtherUserStudent = otherUser.role === "student";
    const isOtherUserTeacher = otherUser.role === "teacher";

    return (
      (isCurrentUserStudent && isOtherUserTeacher) ||
      (isCurrentUserTeacher && isOtherUserStudent)
    );
  }, [selectedRoom, currentUser, getUserById]);

  const getRoomDisplayName = useCallback(
    (room: ChatRoom) => {
      if (room.type === "group") return room.name;
      const otherUser = room.participants.find((p) => p !== currentUser.id);
      return getUserById(otherUser!)?.name || "Unknown";
    },
    [currentUser.id, getUserById],
  );

  const getRoomIcon = useCallback(
    (room: ChatRoom) => {
      if (room.type === "group") return "👥";
      const otherUser = room.participants.find((p) => p !== currentUser.id);
      return getUserById(otherUser!)?.avatar || "👤";
    },
    [currentUser.id, getUserById],
  );

  const getRoomIdForUser = useCallback(
    (userId: string): string | null => {
      for (const [roomId, roomMessages] of messages.entries()) {
        if (roomMessages.length > 0) {
          const allSenders = new Set(roomMessages.map((m) => m.senderId));

          if (
            allSenders.size === 2 &&
            allSenders.has(currentUser.id) &&
            allSenders.has(userId)
          ) {
            return roomId;
          }
        }
      }
      return null;
    },
    [messages, currentUser.id],
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return filteredModuleUsers;

    const query = searchQuery.toLowerCase();
    return {
      students: filteredModuleUsers.students.filter((u) =>
        u.name.toLowerCase().includes(query),
      ),
      teachers: filteredModuleUsers.teachers.filter((u) =>
        u.name.toLowerCase().includes(query),
      ),
    };
  }, [filteredModuleUsers, searchQuery]);

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
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
      <div className="flex items-center gap-3 min-w-[200px]">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all flex-shrink-0 backdrop-blur-sm"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4l10 6-10 6V4z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: `${(currentTime / (message.audioDuration || 1)) * 100}%`,
                }}
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

  const AttachmentMessage: React.FC<{
    message: Message;
    isCurrentUser: boolean;
  }> = ({ message, isCurrentUser }) => {
    const { attachment, content } = message;

    if (!attachment) return null;

    const isImage = attachment.mimetype.startsWith("image/");
    const isVideo = attachment.mimetype.startsWith("video/");
    const fileUrl = `https://chatroom-0u60.onrender.com${attachment.url}`;

    const getFileIconSmall = () => {
      if (isImage) return <ImageIcon className="w-5 h-5" />;
      if (isVideo) return <Video className="w-5 h-5" />;
      if (attachment.mimetype.includes("pdf"))
        return <FileText className="w-5 h-5" />;
      return <File className="w-5 h-5" />;
    };

    const downloadFile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(fileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Download error:", error);
      }
    };

    return (
      <div className="max-w-sm">
        {isImage && (
          <div className="mb-2 rounded-xl overflow-hidden border border-white border-opacity-20">
            <img
              src={fileUrl}
              alt={attachment.originalName}
              className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(fileUrl, "_blank")}
              style={{ maxHeight: "300px" }}
            />
          </div>
        )}

        {isVideo && (
          <div className="mb-2 rounded-xl overflow-hidden border border-white border-opacity-20">
            <video
              controls
              className="max-w-full h-auto rounded-xl"
              style={{ maxHeight: "300px" }}
            >
              <source src={fileUrl} type={attachment.mimetype} />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {!isImage && !isVideo && (
          <div
            className={`
            flex items-center gap-3 p-3 rounded-xl backdrop-blur-sm
            ${
              isCurrentUser
                ? "bg-white bg-opacity-10"
                : "bg-slate-100 border border-slate-200"
            }
          `}
          >
            <div
              className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
              ${isCurrentUser ? "bg-white bg-opacity-20" : "bg-slate-200"}
            `}
            >
              {getFileIconSmall()}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${isCurrentUser ? "text-white" : "text-slate-900"}`}
              >
                {attachment.originalName}
              </p>
              <p
                className={`text-xs ${isCurrentUser ? "text-white text-opacity-70" : "text-slate-500"}`}
              >
                {formatFileSize(attachment.size)}
              </p>
            </div>

            <button
              onClick={downloadFile}
              className={`
                flex-shrink-0 p-2 rounded-lg transition-colors
                ${
                  isCurrentUser
                    ? "hover:bg-white hover:bg-opacity-20 text-white"
                    : "hover:bg-slate-200 text-slate-600"
                }
              `}
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        )}

        {content && (
          <p
            className={`
            mt-2 text-sm px-3 py-2 rounded-xl
            ${
              isCurrentUser
                ? "bg-white bg-opacity-10 text-white"
                : "bg-slate-100 text-slate-900"
            }
          `}
          >
            {content}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-[Inter,system-ui,Segoe_UI,Roboto] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 bg-white flex-col relative shadow-xl border-r border-slate-200`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 flex-shrink-0">
          <div className="flex items-center justify-between text-white mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <MessageCircle size={18} className="text-slate-900" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">
                CHEZA<span className="text-yellow-400">X</span>
              </h1>
            </div>
            <button
              onClick={onLogout}
              className="hover:bg-slate-800 p-2 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Module Selector */}
          <div className="relative">
            {loadingModules ? (
              <div className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm text-center">
                Loading modules...
              </div>
            ) : (
              <>
                <select
                  value={selectedModule?.id || ""}
                  onChange={(e) =>
                    setSelectedModule(
                      modules.find((m) => m.id === e.target.value) || null,
                    )
                  }
                  className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium appearance-none cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.code} - {module.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-3 pointer-events-none text-white"
                  size={16}
                />
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <div className="text-center text-slate-400 text-sm py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-2"></div>
              Loading chats...
            </div>
          ) : (
            <div className="p-2">
              {/* Groups */}
              {moduleGroups.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Groups
                  </div>
                  {moduleGroups.map((group) => {
                    const unreadCount = unreadCounts.get(group.id) || 0;

                    return (
                      <button
                        key={group.id}
                        onClick={() => handleGroupClick(group)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group mb-1 ${
                          selectedRoom?.id === group.id
                            ? "bg-yellow-50 border border-yellow-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                          👥
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">
                            {group.name}
                          </div>
                          <div className="text-xs text-slate-500">Group Chat</div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center flex-shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Students */}
              {filteredUsers.students.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    Students ({filteredUsers.students.length})
                  </div>
                  {filteredUsers.students.map((user) => {
                    const roomId = getRoomIdForUser(user.id);
                    const unreadCount = roomId ? unreadCounts.get(roomId) || 0 : 0;

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group mb-1 ${
                          selectedRoom?.participants.includes(user.id)
                            ? "bg-yellow-50 border border-yellow-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl flex items-center justify-center text-2xl">
                            {user.avatar}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">
                            {user.subscription}
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center flex-shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Teachers */}
              {filteredUsers.teachers.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    Teachers ({filteredUsers.teachers.length})
                  </div>
                  {filteredUsers.teachers.map((user) => {
                    const roomId = getRoomIdForUser(user.id);
                    const unreadCount = roomId ? unreadCounts.get(roomId) || 0 : 0;

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group mb-1 ${
                          selectedRoom?.participants.includes(user.id)
                            ? "bg-yellow-50 border border-yellow-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-2xl">
                            {user.avatar}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500">Teacher</div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center flex-shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {filteredUsers.students.length === 0 && 
               filteredUsers.teachers.length === 0 && 
               moduleGroups.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Users size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <p className="text-xs text-center text-slate-500">
            Powered by{" "}
            <span className="font-semibold text-yellow-500">Rasta Kadema</span>
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 overflow-hidden bg-gradient-to-br from-slate-100 to-white`}
      >
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  {getRoomIcon(selectedRoom)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-slate-900 text-base truncate">
                    {getRoomDisplayName(selectedRoom)}
                  </h2>
                  <div className="text-xs text-slate-500">
                    {selectedRoom.type === "group" ? (
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        Group Chat
                      </span>
                    ) : (
                      (() => {
                        const otherUser = getUserById(
                          selectedRoom.participants.find(
                            (p) => p !== currentUser.id,
                          )!,
                        );
                        return otherUser?.isOnline ? (
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Active now
                          </span>
                        ) : (
                          <span className="text-slate-400">Offline</span>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedRoom.type === "one_to_one" && (
                  <>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600" title="Voice call">
                      <Phone size={20} />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600" title="Video call">
                      <VideoIcon size={20} />
                    </button>
                  </>
                )}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChatMenu(!showChatMenu);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="More options"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {showChatMenu && (
                    <div
                      className="absolute right-0 top-12 bg-white shadow-xl rounded-xl py-2 z-50 border border-slate-200 min-w-[180px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setShowClearConfirm(true);
                          setShowChatMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-red-600 font-medium transition-colors"
                      >
                        <Trash size={16} />
                        Clear Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ paddingBottom: "80px" }}
            >
              {getRoomMessages(selectedRoom.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl flex items-center justify-center mb-4">
                    <MessageCircle size={40} className="text-yellow-600" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600 mb-1">
                    No messages yet
                  </p>
                  <p className="text-sm text-slate-400">
                    Start the conversation with a message
                  </p>
                </div>
              ) : (
                <>
                  {getRoomMessages(selectedRoom.id).map((message, index) => {
                    const sender = getUserById(message.senderId);
                    const isCurrentUser = message.senderId === currentUser.id;
                    const prevMessage =
                      index > 0
                        ? getRoomMessages(selectedRoom.id)[index - 1]
                        : null;
                    const showAvatar =
                      !prevMessage || prevMessage.senderId !== message.senderId;

                    const isDeletedForMe = message.deletedFor?.includes(
                      currentUser.id,
                    );
                    const isDeletedForEveryone = message.deletedForEveryone;

                    if (isDeletedForMe) return null;

                    const getStatusIcon = (message: Message) => {
                      if (message.senderId !== currentUser.id) return null;
                      if (selectedRoom.type === "group") return null;

                      const isRead =
                        message.readBy && message.readBy.length > 1;
                      const isDelivered =
                        message.deliveredTo && message.deliveredTo.length > 0;

                      if (isRead) {
                        return <CheckCheck className="w-4 h-4 text-yellow-500" />;
                      } else if (isDelivered) {
                        return <CheckCheck className="w-4 h-4 text-slate-400" />;
                      } else {
                        return <Check className="w-4 h-4 text-slate-400" />;
                      }
                    };

                    return (
                      <div
                        key={message.clientMessageId || message.id}
                        className={`flex gap-3 ${
                          isCurrentUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {showAvatar ? (
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl flex items-center justify-center text-xl shadow-sm">
                              {sender?.avatar}
                            </div>
                          ) : (
                            <div className="w-10"></div>
                          )}
                        </div>
                        <div
                          className={`flex flex-col ${
                            isCurrentUser ? "items-end" : "items-start"
                          } max-w-[75%] lg:max-w-lg min-w-0`}
                        >
                          {showAvatar && !isCurrentUser && (
                            <div className="text-xs font-semibold text-slate-600 mb-1 px-1">
                              {sender?.name}
                            </div>
                          )}
                          <div
                            onContextMenu={(e) =>
                              handleMessageContextMenu(e, message)
                            }
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              isCurrentUser
                                ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900"
                                : "bg-white text-slate-900 border border-slate-200"
                            } ${
                              message.status === "sending" ? "opacity-60" : ""
                            } break-words cursor-pointer hover:shadow-md transition-all`}
                          >
                            {message.taggedMessage && !isDeletedForEveryone && (
                              <div
                                className={`mb-2 pb-2 border-l-4 pl-3 text-xs rounded ${
                                  isCurrentUser
                                    ? "border-slate-700 bg-slate-800 bg-opacity-20"
                                    : "border-yellow-500 bg-yellow-50"
                                }`}
                              >
                                <div
                                  className={`font-semibold ${
                                    isCurrentUser
                                      ? "text-slate-900"
                                      : "text-yellow-700"
                                  }`}
                                >
                                  {message.taggedMessage.senderName}
                                </div>
                                <div
                                  className={`${
                                    isCurrentUser
                                      ? "text-slate-700"
                                      : "text-slate-600"
                                  } truncate`}
                                >
                                  {message.taggedMessage.content}
                                </div>
                              </div>
                            )}

                            {isDeletedForEveryone ? (
                              <span className="text-sm italic opacity-60 flex items-center gap-2">
                                <Trash2 size={14} />
                                This message was deleted
                              </span>
                            ) : message.type === "attachment" ? (
                              <AttachmentMessage
                                message={message}
                                isCurrentUser={isCurrentUser}
                              />
                            ) : message.type === "audio" ? (
                              <VoiceMessage message={message} />
                            ) : (
                              <span className="text-sm leading-relaxed">
                                {message.content}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 px-1">
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                            {getStatusIcon(message)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Typing Indicator */}
              {getTypingIndicator(selectedRoom.id) && (
                <div className="flex gap-3 items-center">
                  <div className="w-10"></div>
                  <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 italic hidden sm:inline">
                    {getTypingIndicator(selectedRoom.id)}
                  </span>
                </div>
              )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed bg-white shadow-2xl rounded-xl py-2 z-50 border border-slate-200 min-w-[160px]"
                style={{
                  left: `${contextMenu.x}px`,
                  top: `${contextMenu.y}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!contextMenu.message.deletedForEveryone && (
                  <button
                    onClick={() => handleReply(contextMenu.message)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <Reply size={16} className="text-slate-600" />
                    <span className="font-medium text-slate-700">Reply</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(contextMenu.message, false)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                  <span className="font-medium">Delete for Me</span>
                </button>

                {contextMenu.message.senderId === currentUser.id &&
                  !contextMenu.message.deletedForEveryone && (
                    <button
                      onClick={() => handleDelete(contextMenu.message, true)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 font-semibold transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete for Everyone
                    </button>
                  )}
              </div>
            )}

            {/* Clear Chat Confirmation */}
            {showClearConfirm && (
              <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div
                  className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Trash className="text-red-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Clear Chat History?
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {selectedRoom?.type === "group"
                          ? `This will delete all messages in "${getRoomDisplayName(selectedRoom)}" from your device. This action cannot be undone.`
                          : `This will delete all messages with ${getRoomDisplayName(selectedRoom)} from your device. This action cannot be undone.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearChat}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
                    >
                      Clear Chat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachment Preview */}
            {attachmentPreview && (
              <div className="bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
                <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex-shrink-0">
                    {attachmentPreview.preview ? (
                      <img
                        src={attachmentPreview.preview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
                        {getFileIcon(attachmentPreview.file.type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {attachmentPreview.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(attachmentPreview.file.size)}
                    </p>
                    {attachmentPreview.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {attachmentPreview.error}
                      </p>
                    )}
                    {attachmentPreview.uploading && (
                      <p className="text-xs text-yellow-600 mt-1 font-medium">
                        Uploading...
                      </p>
                    )}
                  </div>

                  {!attachmentPreview.uploading && (
                    <button
                      onClick={() => {
                        if (attachmentPreview.preview) {
                          URL.revokeObjectURL(attachmentPreview.preview);
                        }
                        setAttachmentPreview(null);
                      }}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Add a caption (optional)"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="mt-3 w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  disabled={attachmentPreview.uploading}
                  onKeyPress={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                />
              </div>
            )}

            {/* Reply Bar */}
            {replyingTo && (
              <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Reply size={18} className="text-yellow-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-yellow-700">
                      Replying to {replyingTo.senderName}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {replyingTo.content}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1.5 hover:bg-yellow-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={18} className="text-slate-600" />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0 shadow-lg">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleTyping}
                  onKeyPress={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  placeholder={
                    attachmentPreview
                      ? "Add a caption (optional)"
                      : "Type a message..."
                  }
                  disabled={attachmentPreview?.uploading}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent min-w-0 disabled:bg-slate-100"
                />

                {isStudentTeacherRoom() && !attachmentPreview && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
                    title="Attach file"
                  >
                    <Paperclip size={20} />
                  </button>
                )}

                {!attachmentPreview && (
                  <button
                    onClick={() => setShowVoiceRecorder(true)}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
                    title="Voice message"
                  >
                    <Mic size={20} />
                  </button>
                )}

                <button
                  onClick={handleSendMessage}
                  disabled={
                    attachmentPreview
                      ? attachmentPreview.uploading
                      : !messageInput.trim()
                  }
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 rounded-xl hover:from-yellow-500 hover:to-yellow-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold flex-shrink-0 shadow-sm disabled:shadow-none"
                >
                  <Send size={18} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>

            {/* Voice Recorder Modal */}
            {showVoiceRecorder && (
              <VoiceRecorder
                onSend={handleVoiceSend}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-3xl flex items-center justify-center mb-6">
              <MessageCircle size={48} className="text-yellow-600" />
            </div>
            <p className="text-xl font-bold text-slate-600 mb-2 text-center">
              Select a chat to start messaging
            </p>
            <p className="text-sm text-center text-slate-400">
              Choose a contact or group from the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}