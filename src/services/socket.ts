/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000/";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(SOCKET_URL, {
      auth: { token },
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  joinModule(moduleId: string) {
    this.socket?.emit("join_module", { moduleId });
  }

  onNewMessageNotification(callback: (data: any) => void) {
    this.socket?.on("new_message_notification", callback);
  }

  joinRoom(roomId: string) {
    this.socket?.emit("join_room", { roomId });
  }

  sendMessage(data: {
    roomId: string;
    content: string;
    moduleId: string;
    targetUserId?: string;
    clientMessageId: string;
    type?: "text" | "audio";
    audioUrl?: string;
    audioDuration?: number;
    taggedMessage?: {              // NEW: Reply feature
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      type: 'text' | 'audio';
    };
  }) {
    this.socket?.emit("send_message", data);
  }

  // NEW: Delete message
  deleteMessage(messageId: string, roomId: string, deleteForEveryone: boolean) {
    this.socket?.emit("delete_message", {
      messageId,
      roomId,
      deleteForEveryone,
    });
  }

  // NEW: Listen for message deletions
  onMessageDeleted(callback: (data: any) => void) {
    this.socket?.on("message_deleted", callback);
  }

  sendTyping(roomId: string, isTyping: boolean) {
    this.socket?.emit("typing", { roomId, isTyping });
  }

  sendReadReceipt(messageId: string, roomId: string) {
    this.socket?.emit("read_receipt", { messageId, roomId });
  }

  onNewMessage(callback: (data: any) => void) {
    this.socket?.on("new_message", callback);
  }

  onUserTyping(callback: (data: any) => void) {
    this.socket?.on("user_typing", callback);
  }

  onUserOnline(callback: (data: any) => void) {
    this.socket?.on("user_online", callback);
  }

  onUserOffline(callback: (data: any) => void) {
    this.socket?.on("user_offline", callback);
  }

  onModuleUsers(callback: (data: any) => void) {
    this.socket?.on("module_users", callback);
  }

  onRoomHistory(callback: (data: any) => void) {
    this.socket?.on("room_history", callback);
  }

  onError(callback: (data: any) => void) {
    this.socket?.on("error", callback);
  }
}

export default new SocketService();