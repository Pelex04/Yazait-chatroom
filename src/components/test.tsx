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
  ChevronRight,
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
  Moon,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<TaggedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Collapsible section states
  const [instructorsOpen, setInstructorsOpen] = useState(true);
  const [classmatesOpen, setClassmatesOpen] = useState(true);
  const [studyGroupsOpen, setStudyGroupsOpen] = useState(true);

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

  // Filter users/groups by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return filteredModuleUsers.students;
    return filteredModuleUsers.students.filter((u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [filteredModuleUsers.students, searchQuery]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery) return filteredModuleUsers.teachers;
    return filteredModuleUsers.teachers.filter((u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [filteredModuleUsers.teachers, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return moduleGroups;
    return moduleGroups.filter((g: any) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [moduleGroups, searchQuery]);

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
        " http://localhost:5000/api/voice/upload-voice",
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
        "http://localhost:5000/api/attachment/upload-attachment",
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

  // Get last message preview for a user's chat
  const getLastMessagePreview = useCallback(
    (userId: string): { text: string; time: string } | null => {
      const roomId = getRoomIdForUser(userId);
      if (!roomId) return null;
      const roomMsgs = messages.get(roomId) || [];
      if (roomMsgs.length === 0) return null;
      const lastMsg = roomMsgs[roomMsgs.length - 1];
      if (lastMsg.deletedForEveryone) return { text: "This message was deleted", time: formatTimeShort(lastMsg.timestamp) };
      let text = "";
      if (lastMsg.type === "audio") text = "🎤 Voice message";
      else if (lastMsg.type === "attachment") text = "📎 " + (lastMsg.attachment?.originalName || "Attachment");
      else text = lastMsg.content;
      if (lastMsg.senderId === currentUser.id) text = "You: " + text;
      return { text, time: formatTimeShort(lastMsg.timestamp) };
    },
    [messages, currentUser.id],
  );

  const getLastMessagePreviewForGroup = useCallback(
    (groupId: string): { text: string; time: string } | null => {
      const roomMsgs = messages.get(groupId) || [];
      if (roomMsgs.length === 0) return null;
      const lastMsg = roomMsgs[roomMsgs.length - 1];
      if (lastMsg.deletedForEveryone) return { text: "This message was deleted", time: formatTimeShort(lastMsg.timestamp) };
      const sender = getUserById(lastMsg.senderId);
      let text = "";
      if (lastMsg.type === "audio") text = "🎤 Voice message";
      else if (lastMsg.type === "attachment") text = "📎 " + (lastMsg.attachment?.originalName || "Attachment");
      else text = lastMsg.content;
      const prefix = lastMsg.senderId === currentUser.id ? "You" : (sender?.name?.split(" ")[0] || "");
      text = prefix + ": " + text;
      return { text, time: formatTimeShort(lastMsg.timestamp) };
    },
    [messages, currentUser.id, getUserById],
  );

  const formatTimeShort = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (daysDiff === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (daysDiff === 1) return "Yesterday";
    else if (daysDiff <= 6) {
      return date.toLocaleDateString([], { weekday: "long" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

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
      <div className="flex items-center gap-2 sm:gap-3 min-w-[180px] sm:min-w-[200px]">
        <button
          onClick={togglePlay}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all flex-shrink-0"
        >
          {isPlaying ? (
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
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
                  width: `${
                    (currentTime / (message.audioDuration || 1)) * 100
                  }%`,
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
          src={`http://localhost:5000${message.audioUrl}`}
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
    const fileUrl = `http://localhost:5000${attachment.url}`;

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
          <div className="mb-2 rounded-lg overflow-hidden">
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
          <div className="mb-2 rounded-lg overflow-hidden">
            <video
              controls
              className="max-w-full h-auto rounded-lg"
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
            flex items-center gap-3 p-3 rounded-lg
            ${
              isCurrentUser
                ? "bg-teal-600 text-white"
                : "bg-white border border-gray-200 text-gray-900"
            }
          `}
          >
            <div
              className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
              ${isCurrentUser ? "bg-teal-500" : "bg-gray-100"}
            `}
            >
              {getFileIconSmall()}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${isCurrentUser ? "text-white" : "text-gray-900"}`}
              >
                {attachment.originalName}
              </p>
              <p
                className={`text-xs ${isCurrentUser ? "text-teal-100" : "text-gray-500"}`}
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
                    ? "hover:bg-teal-500 text-white"
                    : "hover:bg-gray-100 text-gray-600"
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
            mt-2 text-sm px-3 py-2 rounded-lg
            ${
              isCurrentUser
                ? "bg-teal-600 text-white"
                : "bg-white border border-gray-200 text-gray-900"
            }
          `}
          >
            {content}
          </p>
        )}
      </div>
    );
  };

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

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* ===================== SIDEBAR ===================== */}
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex-col relative`}
      >
        {/* Top Header: Logo + Moon icon */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Teal circle logo */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2dd4bf, #0d9488)" }}>
              <MessageCircle size={16} className="text-white" fill="white" />
            </div>
            <span className="text-lg font-bold text-gray-800" style={{ letterSpacing: "-0.02em" }}>ChezaX</span>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <Moon size={18} />
          </button>
        </div>

        {/* Module Selector Card */}
        <div className="px-4 pb-3">
          <div className="relative">
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 cursor-pointer hover:border-gray-300 transition-colors">
              {loadingModules ? (
                <div className="text-sm text-gray-400">Loading...</div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-gray-800">{selectedModule?.code || ""}</div>
                  <div className="text-xs text-gray-500">{selectedModule?.name || ""}</div>
                </>
              )}
            </div>
            <select
              value={selectedModule?.id || ""}
              onChange={(e) =>
                setSelectedModule(
                  modules.find((m) => m.id === e.target.value) || null,
                )
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats, classmates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-colors"
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-2">

          {/* ---- Instructors Section ---- */}
          <div className="mb-1">
            <button
              onClick={() => setInstructorsOpen(!instructorsOpen)}
              className="w-full flex items-center justify-between px-2 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="font-medium">Instructors</span>
              {instructorsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {instructorsOpen && (
              <div>
                {loadingUsers ? (
                  <div className="text-center text-gray-400 text-xs py-3">Loading...</div>
                ) : filteredTeachers.length > 0 ? (
                  filteredTeachers.map((user) => {
                    const roomId = getRoomIdForUser(user.id);
                    const unreadCount = roomId ? unreadCounts.get(roomId) || 0 : 0;
                    const isActive = selectedRoom && roomId === selectedRoom.id;
                    const preview = getLastMessagePreview(user.id);

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors relative ${
                          isActive
                            ? "bg-teal-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Active left border */}
                        {isActive && (
                          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-teal-500 rounded-full" />
                        )}

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-base overflow-hidden">
                            {user.avatar}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {preview ? preview.text : "Teacher"}
                          </div>
                        </div>

                        {/* Right: time + unread dot */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {preview && (
                            <span className="text-xs text-gray-400">{preview.time}</span>
                          )}
                          {unreadCount > 0 && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 px-2 py-2">No instructors</div>
                )}
              </div>
            )}
          </div>

          {/* ---- Classmates Section ---- */}
          <div className="mb-1">
            <button
              onClick={() => setClassmatesOpen(!classmatesOpen)}
              className="w-full flex items-center justify-between px-2 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="font-medium">Classmates</span>
              {classmatesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {classmatesOpen && (
              <div>
                {loadingUsers ? (
                  <div className="text-center text-gray-400 text-xs py-3">Loading...</div>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((user) => {
                    const roomId = getRoomIdForUser(user.id);
                    const unreadCount = roomId ? unreadCounts.get(roomId) || 0 : 0;
                    const isActive = selectedRoom && roomId === selectedRoom.id;
                    const preview = getLastMessagePreview(user.id);

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors relative ${
                          isActive
                            ? "bg-teal-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-teal-500 rounded-full" />
                        )}

                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-base overflow-hidden">
                            {user.avatar}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {preview ? preview.text : user.subscription}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {preview && (
                            <span className="text-xs text-gray-400">{preview.time}</span>
                          )}
                          {unreadCount > 0 && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 px-2 py-2">No classmates</div>
                )}
              </div>
            )}
          </div>

          {/* ---- Study Groups Section ---- */}
          <div className="mb-1">
            <button
              onClick={() => setStudyGroupsOpen(!studyGroupsOpen)}
              className="w-full flex items-center justify-between px-2 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="font-medium">Study Groups</span>
              {studyGroupsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {studyGroupsOpen && (
              <div>
                {loadingUsers ? (
                  <div className="text-center text-gray-400 text-xs py-3">Loading...</div>
                ) : filteredGroups.length > 0 ? (
                  filteredGroups.map((group: any) => {
                    const unreadCount = unreadCounts.get(group.id) || 0;
                    const isActive = selectedRoom?.id === group.id;
                    const preview = getLastMessagePreviewForGroup(group.id);

                    return (
                      <button
                        key={group.id}
                        onClick={() => handleGroupClick(group)}
                        className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors relative ${
                          isActive
                            ? "bg-teal-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-teal-500 rounded-full" />
                        )}

                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-base">
                            👥
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-gray-800 truncate">{group.name}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {preview ? preview.text : "Group Chat"}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {preview && (
                            <span className="text-xs text-gray-400">{preview.time}</span>
                          )}
                          {unreadCount > 0 && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 px-2 py-2">No study groups</div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* No footer per new design */}
      </div>

      {/* ===================== CHAT AREA ===================== */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 overflow-hidden bg-gray-100`}
      >
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                  {getRoomIcon(selectedRoom)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-800 text-sm truncate">
                    {getRoomDisplayName(selectedRoom)}
                  </h2>
                  <div className="text-xs text-gray-400">
                    {selectedRoom.type === "group" ? (
                      <span>Group Chat</span>
                    ) : (
                      (() => {
                        const otherUser = getUserById(
                          selectedRoom.participants.find(
                            (p) => p !== currentUser.id,
                          )!,
                        );
                        return otherUser?.isOnline ? (
                          <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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

              {/* Three-Dot Menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChatMenu(!showChatMenu);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="More options"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </button>

                {showChatMenu && (
                  <div
                    className="absolute right-0 top-10 bg-white shadow-lg rounded-lg py-1.5 z-50 border border-gray-200 min-w-[160px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowClearConfirm(true);
                        setShowChatMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors"
                    >
                      <Trash size={14} />
                      Clear Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4 md:p-6"
              style={{ paddingBottom: "80px" }}
            >
              {getRoomMessages(selectedRoom.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle size={36} className="mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No messages yet</p>
                  <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
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
                        return (
                          <svg
                            className="w-3.5 h-3.5 text-teal-500"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M0 8l2-2 3 3 7-7 2 2-9 9z" />
                            <path d="M5 8l2-2 3 3 7-7 2 2-9 9z" opacity="0.6" />
                          </svg>
                        );
                      } else if (isDelivered) {
                        return (
                          <svg
                            className="w-3.5 h-3.5 text-gray-400"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M0 8l2-2 3 3 7-7 2 2-9 9z" />
                            <path d="M5 8l2-2 3 3 7-7 2 2-9 9z" opacity="0.6" />
                          </svg>
                        );
                      } else {
                        return (
                          <svg
                            className="w-3.5 h-3.5 text-gray-400"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M0 8l2-2 3 3 7-7 2 2-9 9z" />
                          </svg>
                        );
                      }
                    };

                    return (
                      <div
                        key={message.clientMessageId || message.id}
                        className={`flex gap-2 mb-3 ${
                          isCurrentUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {showAvatar ? (
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                              {sender?.avatar}
                            </div>
                          ) : (
                            <div className="w-7"></div>
                          )}
                        </div>
                        <div
                          className={`flex flex-col ${
                            isCurrentUser ? "items-end" : "items-start"
                          } max-w-[75%] sm:max-w-md lg:max-w-lg min-w-0`}
                        >
                          {showAvatar && !isCurrentUser && (
                            <div className="text-xs font-semibold text-gray-600 mb-0.5 px-1">
                              {sender?.name}
                            </div>
                          )}
                          <div
                            onContextMenu={(e) =>
                              handleMessageContextMenu(e, message)
                            }
                            className={`px-3 py-2 rounded-2xl ${
                              isCurrentUser
                                ? "text-white"
                                : "bg-white text-gray-800 border border-gray-200 shadow-sm"
                            } ${
                              message.status === "sending" ? "opacity-60" : ""
                            } break-words cursor-pointer hover:shadow-md transition-shadow`}
                            style={isCurrentUser ? { background: "linear-gradient(135deg, #2dd4bf, #0d9488)" } : {}}
                          >
                            {/* Tagged/Replied Message */}
                            {message.taggedMessage && !isDeletedForEveryone && (
                              <div
                                className={`mb-2 pb-2 border-l-4 pl-2 text-xs ${
                                  isCurrentUser
                                    ? "border-white/40"
                                    : "border-teal-500"
                                }`}
                              >
                                <div
                                  className={`font-semibold ${
                                    isCurrentUser
                                      ? "text-white/90"
                                      : "text-teal-600"
                                  }`}
                                >
                                  {message.taggedMessage.senderName}
                                </div>
                                <div
                                  className={`${
                                    isCurrentUser
                                      ? "text-white/70"
                                      : "text-gray-500"
                                  } truncate`}
                                >
                                  {message.taggedMessage.content}
                                </div>
                              </div>
                            )}

                            {/* Message Content */}
                            {isDeletedForEveryone ? (
                              <span className="text-sm italic opacity-60">
                                🚫 This message was deleted
                              </span>
                            ) : message.type === "attachment" ? (
                              <AttachmentMessage
                                message={message}
                                isCurrentUser={isCurrentUser}
                              />
                            ) : message.type === "audio" ? (
                              <VoiceMessage message={message} />
                            ) : (
                              <span className="text-sm">
                                {message.content}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 px-1">
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
                <div className="flex gap-2 items-center mb-3">
                  <div className="w-7"></div>
                  <div className="bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 italic hidden sm:inline">
                    {getTypingIndicator(selectedRoom.id)}
                  </span>
                </div>
              )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed bg-white shadow-lg rounded-lg py-1.5 z-50 border border-gray-200 min-w-[150px]"
                style={{
                  left: `${contextMenu.x}px`,
                  top: `${contextMenu.y}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!contextMenu.message.deletedForEveryone && (
                  <button
                    onClick={() => handleReply(contextMenu.message)}
                    className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                  >
                    <Reply size={14} />
                    Reply
                  </button>
                )}

                <button
                  onClick={() => handleDelete(contextMenu.message, false)}
                  className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete for Me
                </button>

                {contextMenu.message.senderId === currentUser.id &&
                  !contextMenu.message.deletedForEveryone && (
                    <button
                      onClick={() => handleDelete(contextMenu.message, true)}
                      className="w-full px-4 py-2 text-left text-xs font-semibold hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete for Everyone
                    </button>
                  )}
              </div>
            )}

            {/* Clear Chat Confirmation Dialog */}
            {showClearConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div
                  className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Trash className="text-red-600" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">
                        Clear Chat History?
                      </h3>
                      <p className="text-xs text-gray-500">
                        {selectedRoom?.type === "group"
                          ? `This will delete all messages in "${getRoomDisplayName(selectedRoom)}" from your device. This action cannot be undone.`
                          : `This will delete all messages with ${getRoomDisplayName(selectedRoom)} from your device. This action cannot be undone.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearChat}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
              <div className="bg-white border-t border-gray-200 px-4 py-3">
                <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex-shrink-0">
                    {attachmentPreview.preview ? (
                      <img
                        src={attachmentPreview.preview}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                        {getFileIcon(attachmentPreview.file.type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {attachmentPreview.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(attachmentPreview.file.size)}
                    </p>
                    {attachmentPreview.error && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {attachmentPreview.error}
                      </p>
                    )}
                    {attachmentPreview.uploading && (
                      <p className="text-xs text-teal-600 mt-0.5">Uploading...</p>
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
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Add a caption (optional)"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                  disabled={attachmentPreview.uploading}
                  onKeyPress={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                />
              </div>
            )}

            {/* Reply Bar */}
            {replyingTo && (
              <div className="bg-teal-50 border-t border-teal-100 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Reply size={14} className="text-teal-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-teal-600">
                      {replyingTo.senderName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {replyingTo.content}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-teal-100 rounded transition-colors flex-shrink-0"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            )}

            {/* Message Input Bar */}
            <div className="bg-white border-t border-gray-200 px-3 py-2.5 flex-shrink-0">
              <div className="flex gap-2 items-center">
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
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 min-w-0 disabled:bg-gray-50 transition-colors"
                />

                {/* Paperclip - student-teacher only */}
                {isStudentTeacherRoom() && !attachmentPreview && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                    title="Attach file"
                  >
                    <Paperclip size={18} />
                  </button>
                )}

                {/* Mic */}
                {!attachmentPreview && (
                  <button
                    onClick={() => setShowVoiceRecorder(true)}
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                    title="Voice message"
                  >
                    <Mic size={18} />
                  </button>
                )}

                {/* Send */}
                <button
                  onClick={handleSendMessage}
                  disabled={
                    attachmentPreview
                      ? attachmentPreview.uploading
                      : !messageInput.trim()
                  }
                  className="p-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2dd4bf, #0d9488)" }}
                >
                  <Send size={16} />
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
          /* ========= EMPTY STATE ========= */
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Illustration: stacked chat bubble shapes */}
            <div className="mb-6 relative w-32 h-28 flex items-end justify-center">
              {/* Back bubble - larger, lighter teal */}
              <div
                className="absolute rounded-2xl shadow-md"
                style={{
                  width: "110px",
                  height: "68px",
                  background: "linear-gradient(135deg, #5eead4, #2dd4bf)",
                  bottom: "0px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {/* Tail */}
                <div
                  className="absolute"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderTop: "12px solid #2dd4bf",
                    bottom: "-12px",
                    left: "20px",
                  }}
                />
              </div>

              {/* Front bubble - smaller, darker teal, offset up-right */}
              <div
                className="absolute rounded-2xl shadow-lg"
                style={{
                  width: "80px",
                  height: "48px",
                  background: "linear-gradient(135deg, #0d9488, #0f766e)",
                  bottom: "32px",
                  right: "2px",
                }}
              >
                {/* Three dots inside */}
                <div className="flex items-center justify-center gap-1.5 h-full px-3">
                  <div className="w-2 h-2 rounded-full bg-white opacity-60" />
                  <div className="w-2 h-2 rounded-full bg-white opacity-80" />
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                {/* Tail pointing up-left */}
                <div
                  className="absolute"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "10px solid #0f766e",
                    top: "-10px",
                    left: "14px",
                  }}
                />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ letterSpacing: "-0.02em" }}>
              Ready to Learn Together
            </h2>

            <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">
              Select a chat to start collaborating with your classmates, ask questions, and share study materials with{" "}
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white mx-1"
                style={{ background: "linear-gradient(135deg, #2dd4bf, #0d9488)" }}
              >
                {selectedModule?.code || "CS 301"}
              </span>
            </p>

            <button
              className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #2dd4bf, #0d9488)" }}
            >
              <Users size={15} />
              Find Study Partners
            </button>
          </div>
        )}
      </div>
    </div>
  );
}