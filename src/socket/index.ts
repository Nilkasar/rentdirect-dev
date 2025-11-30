import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';
import { chatService } from '../services/chat.service';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export const setupSocketIO = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.userId}`);

    // Join user to their personal room (for notifications)
    if (socket.user) {
      socket.join(`user:${socket.user.userId}`);
    }

    // Join a conversation room
    socket.on('join:conversation', async (conversationId: string) => {
      try {
        if (!socket.user) return;

        // Verify user has access to this conversation
        await chatService.getConversationById(conversationId, socket.user.userId);

        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.user.userId} joined conversation ${conversationId}`);
      } catch (error) {
        socket.emit('error', { message: 'Cannot join conversation' });
      }
    });

    // Leave a conversation room
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send a message
    socket.on('message:send', async (data: { conversationId: string; content: string }) => {
      try {
        if (!socket.user) return;

        const message = await chatService.sendMessage(
          data.conversationId,
          socket.user.userId,
          data.content
        );

        // Broadcast to conversation room
        io.to(`conversation:${data.conversationId}`).emit('message:new', message);

        // Get conversation to find the other user
        const conversation = await chatService.getConversationById(
          data.conversationId,
          socket.user.userId
        );

        // Notify the other user if they're not in the conversation room
        const otherUserId = socket.user.role === 'OWNER'
          ? conversation.tenantId
          : conversation.ownerId;

        io.to(`user:${otherUserId}`).emit('notification:message', {
          conversationId: data.conversationId,
          message,
          property: conversation.property,
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('message:read', async (conversationId: string) => {
      try {
        if (!socket.user) return;

        await chatService.markMessagesAsRead(conversationId, socket.user.userId);

        // Notify sender that messages were read
        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          readBy: socket.user.userId,
        });
      } catch (error) {
        // Silent fail for read receipts
      }
    });

    // Typing indicator
    socket.on('typing:start', (conversationId: string) => {
      if (!socket.user) return;
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: socket.user.userId,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      if (!socket.user) return;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: socket.user.userId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.userId}`);
    });
  });

  return io;
};
