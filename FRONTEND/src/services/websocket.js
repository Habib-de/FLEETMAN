// src/services/websocket.js
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.subscriptions = {};
    this.messageHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.useWebSocket = true; // ✅ Flag to enable/disable WebSocket
  }

  connect(token, onConnected, onDisconnected) {
    // ✅ Check if WebSocket should be used
    if (!this.useWebSocket) {
      console.log('ℹ️ WebSocket disabled - using REST polling fallback');
      this.connected = true; // Pretend connected so app works
      if (onConnected) onConnected();
      return;
    }

    if (this.connected) {
      console.log('WebSocket already connected');
      if (onConnected) onConnected();
      return;
    }

    try {
      const socket = new SockJS('http://localhost:8080/api/ws/raw');
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket]', str);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.stompClient.onConnect = (frame) => {
        console.log('✅ WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        if (onConnected) onConnected();
        this.subscribeToPublicTopics();
      };

      this.stompClient.onStompError = (frame) => {
        console.error('❌ WebSocket error:', frame);
        // ✅ Fallback to REST polling on error
        this.useWebSocket = false;
        this.connected = true;
        if (onConnected) onConnected();
      };

      this.stompClient.onWebSocketClose = () => {
        console.log('WebSocket disconnected - using REST polling fallback');
        this.connected = false;
        if (onDisconnected) onDisconnected();
        
        // ✅ Don't retry too many times
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => {
            if (!this.connected) {
              this.connect(token, onConnected, onDisconnected);
            }
          }, 5000);
        } else {
          // ✅ After max retries, disable WebSocket and use REST
          console.log('ℹ️ Max WebSocket retries reached - using REST polling fallback');
          this.useWebSocket = false;
          this.connected = true;
          if (onConnected) onConnected();
        }
      };

      this.stompClient.activate();
    } catch (error) {
      // ✅ Catch any connection errors and fallback to REST
      console.warn('⚠️ WebSocket connection failed:', error.message);
      console.log('ℹ️ Falling back to REST polling');
      this.useWebSocket = false;
      this.connected = true;
      if (onConnected) onConnected();
    }
  }

  subscribeToPublicTopics() {
    if (!this.useWebSocket) return;
    
    // Subscribe to tracking updates
    this.subscribe('/topic/tracking', (message) => {
      try {
        const data = JSON.parse(message.body);
        this.handleMessage('tracking', data);
      } catch (e) {
        console.error('Failed to parse tracking message:', e);
      }
    });

    // Subscribe to trip updates
    this.subscribe('/topic/trips', (message) => {
      try {
        const data = JSON.parse(message.body);
        this.handleMessage('trip', data);
      } catch (e) {
        console.error('Failed to parse trip message:', e);
      }
    });

    // Subscribe to alarm updates
    this.subscribe('/topic/alarms', (message) => {
      try {
        const data = JSON.parse(message.body);
        this.handleMessage('alarm', data);
      } catch (e) {
        console.error('Failed to parse alarm message:', e);
      }
    });
  }

  subscribe(topic, callback) {
    if (!this.useWebSocket || !this.stompClient || !this.connected) {
      // ✅ Store callbacks for when/if WebSocket connects
      if (!this.subscriptions[topic]) {
        this.subscriptions[topic] = [];
      }
      this.subscriptions[topic].push(callback);
      return;
    }

    try {
      const subscription = this.stompClient.subscribe(topic, (message) => {
        callback(message);
      });

      if (!this.subscriptions[topic]) {
        this.subscriptions[topic] = [];
      }
      this.subscriptions[topic].push(subscription);
    } catch (e) {
      console.warn('Failed to subscribe to topic:', topic, e);
    }
  }

  handleMessage(type, data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(type, data);
      } catch (e) {
        console.error('Error in message handler:', e);
      }
    });
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  send(destination, message) {
    if (!this.useWebSocket || !this.stompClient || !this.connected) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }
    try {
      this.stompClient.publish({
        destination: destination,
        body: JSON.stringify(message)
      });
    } catch (e) {
      console.warn('Failed to send WebSocket message:', e);
    }
  }

  disconnect() {
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (e) {
        console.warn('Error disconnecting WebSocket:', e);
      }
      this.connected = false;
      this.subscriptions = {};
      this.messageHandlers = [];
    }
  }

  isConnected() {
    return this.connected || !this.useWebSocket;
  }

  // ✅ Method to check if using real WebSocket or REST fallback
  isUsingWebSocket() {
    return this.useWebSocket && this.connected;
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;