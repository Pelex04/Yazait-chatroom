/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://chatroom-0u60.onrender.com/";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(SOCKET_URL, {
      auth: { token },
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket server");
    });

    this.socket.on("error", (error: any) => {
      console.error("WebSocket error:", error);
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

  // Join module
  joinModule(moduleId: string) {
    this.socket?.emit("join_module", { moduleId });
  }
  onNewMessageNotification(callback: (data: any) => void) {
    this.socket?.on("new_message_notification", callback);
  }
  // Join room
  joinRoom(roomId: string) {
    this.socket?.emit("join_room", { roomId });
  }

  // Send message
  sendMessage(data: {
    roomId: string;
    content: string;
    moduleId: string;
    targetUserId?: string;
    clientMessageId: string;
    type?: "text" | "audio";
    audioUrl?: string;
    audioDuration?: number;
  }) {
    this.socket?.emit("send_message", data);
  }

  // Typing indicator
  sendTyping(roomId: string, isTyping: boolean) {
    this.socket?.emit("typing", { roomId, isTyping });
  }

  // Read receipt
  sendReadReceipt(messageId: string, roomId: string) {
    this.socket?.emit("read_receipt", { messageId, roomId });
  }

  // Listen to events
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
