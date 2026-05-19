import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useNotifications } from "./NotificationContext.jsx";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [socket, setSocket] = useState(null);

  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Global socket connected:", newSocket.id);
      if (currentUserId) {
        newSocket.emit("register_user", currentUserId);
      }
    });

    // Handle global notifications
    newSocket.on("new_message_notification", (data) => {
      addNotification(
        `💬 ${data.senderName} messaged on "${data.imageTitle}": ${data.text}`,
        "chat",
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId, addNotification]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
