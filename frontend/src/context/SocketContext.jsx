import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useNotifications } from "./NotificationContext.jsx";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const socketRef = useRef(null);

  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    // Only connect if user is logged in
    if (!currentUserId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);

      socketRef.current.on("connect", () => {
        console.log("Global socket connected:", socketRef.current.id);
        socketRef.current.emit("register_user", currentUserId);
      });

      // Handle global notifications
      socketRef.current.on("new_message_notification", (data) => {
        addNotification(
          `💬 ${data.senderName} messaged on "${data.imageTitle}": ${data.text}`,
          "chat",
        );
      });
    }

    return () => {
      // We don't necessarily want to disconnect on every re-render, 
      // but cleanup is good. The currentUserId dependency handles reconnections.
    };
  }, [currentUserId, addNotification]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
