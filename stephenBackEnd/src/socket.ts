/**
 * WebSocket server module for real-time bidirectional communication.
 * Manages client connections, subscriptions, and message broadcasting for live updates.
 * Handles sprinkler control, ESP device discovery, and power meter data streaming.
 *
 * Features:
 * - Client subscription management for different data topics
 * - Automatic client timeout detection and cleanup
 * - Message queuing and rate limiting for sprinkler commands
 * - Real-time broadcasting to subscribed clients
 * - Connection monitoring with ping/pong heartbeats
 * - UUID-based client identification
 *
 * @module socket
 */

import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { sprinklerMessages, sendSprinklerMessage } from "sprinkler";
import { logsDir, log } from "miscellaneous";
import fs from "fs";
import path from "path";

/** Log file path for WebSocket server operations */
const __logFile = path.join(logsDir, `socket.log`);

/**
 * Metadata stored for each connected WebSocket client.
 * Tracks client state, subscriptions, and connection health.
 */
interface ClientMetadata {
  /** Unique client identifier (UUID v4) */
  id: string;
  /** Client IP address (extracted from headers or socket) */
  ip: string;
  /** Timestamp (ms) of the last received message or pong */
  lastMessage: number;
  /** Array of subscribed topic names for selective message delivery */
  subscriptions: string[];
}

/**
 * Available subscription topics for client filtering.
 * Determines which types of real-time data clients can receive.
 */
export type Topic = "sprinkler" | "meter" | "ESPlist" | "test";

/** Map of active WebSocket connections to their metadata */
const clients = new Map<WebSocket, ClientMetadata>();

/**
 * Broadcast a message to all clients subscribed to a specific topic.
 * Filters clients based on their subscription preferences and sends formatted messages.
 *
 * @param topic - The topic/channel to broadcast to
 * @param data - The data payload to send to subscribed clients
 *
 * @example
 * ```typescript
 * // Broadcast power meter readings to subscribed clients
 * broadcast("meter", { amperages: [1.2, 2.3, 3.4, 4.5, 5.6, 6.7], timestamp: Date.now() });
 *
 * // Broadcast ESP device discovery to subscribed clients
 * broadcast("ESPlist", { name: "PowerMeter-ESP32", ip: "192.168.0.100", date: new Date() });
 * ```
 */
export const broadcast = (topic: Topic, data: any) => {
  clients.forEach((metadata, ws) => {
    if (metadata.subscriptions.includes(topic)) {
      ws.send(JSON.stringify({ command: topic, data }));
    }
  });
};

/**
 * Generates a UUID v4 string for unique client identification.
 * Uses standard UUID v4 format with random hex characters.
 *
 * @returns A random UUID v4 string in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * ```typescript
 * const clientId = uuidv4();
 * // Returns: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * ```
 */
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Starts a WebSocket server on the given HTTP server to handle real-time client communication.
 * Sets up message handlers, client management, and periodic maintenance tasks.
 *
 * Features:
 * - Client connection and disconnection handling
 * - Message routing based on command types
 * - Subscription management for selective data delivery
 * - Automatic client timeout detection (45 seconds)
 * - Rate-limited sprinkler message delivery (500ms intervals)
 * - Ping/pong heartbeat mechanism for connection health
 *
 * @param server - An HTTP server instance on which to mount the WebSocket server
 *
 * @example
 * ```typescript
 * import http from 'http';
 * const server = http.createServer();
 * socketServer(server);
 * server.listen(3000);
 * // WebSocket server now available at ws://localhost:3000
 * ```
 */
export function socketServer(server: http.Server): void {
  const wss = new WebSocketServer({ server });
  log(__logFile, "Starting WebSocket server on port", process.env.PORT);

  /**
   * Rate-limited sprinkler message delivery interval.
   * Processes queued sprinkler messages at 500ms intervals to prevent flooding.
   */
  setInterval(() => {
    // limit to one message per half second
    if (sprinklerMessages.length > 0) {
      clients.forEach((metadata, ws) => {
        // relay message from sprinkler esp32 to client
        if (metadata.subscriptions.includes("sprinkler")) {
          ws.send(JSON.stringify(sprinklerMessages[0]));
        }
      });
      sprinklerMessages.shift();
    }
  }, 500);

  /**
   * Client health monitoring and cleanup interval.
   * Pings all clients every 45 seconds and removes unresponsive connections.
   * Clients must respond within 45 seconds or they will be disconnected.
   */
  setInterval(() => {
    const now = Date.now();
    for (const [client, meta] of clients.entries()) {
      if (now - meta.lastMessage > 45_000) {
        log(__logFile, "Client timed out:", meta.id);
        client.close();
        clients.delete(client);
      } else {
        client.send(JSON.stringify({ command: "ping" }));
      }
    }
    log(__logFile, "Pinging clients");
  }, 45_000);

  /**
   * Handle new WebSocket connections.
   * Sets up client metadata, message handlers, and subscription management.
   */
  wss.on("connection", (ws, req) => {
    const id = uuidv4();

    /**
     * Generate client metadata for connection tracking.
     * Extracts IP address from headers (for proxied connections) or socket.
     */
    const metadata: ClientMetadata = {
      id,
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress?.replace(/.*:/, "") || "unknown",
      subscriptions: [],
      lastMessage: Date.now(),
    };

    clients.set(ws, metadata);
    log(__logFile, "Web Socket connection opened from: " + id);

    /**
     * Handle test messages by echoing them back with sender identification.
     * Used for connection testing and debugging.
     *
     * @param message - The test message received from client
     * @param metadata - Client metadata for sender identification
     */
    const handleTestMessage = (message: any, metadata: any) => {
      message.sender = metadata.id;
      ws.send(JSON.stringify(message));
    };

    /**
     * Handle ESP device list messages by echoing them back with sender identification.
     * Used for ESP device discovery and status updates.
     *
     * @param message - The ESP list message received from client
     * @param metadata - Client metadata for sender identification
     */
    const handleESPlistMessage = (message: any, metadata: any) => {
      message.sender = metadata.id;
      ws.send(JSON.stringify(message));
      //   ws.send(JSON.stringify({ ...message, ESPlist: { ...ESPlist } }));
    };

    /**
     * Handle incoming WebSocket messages and route them based on command type.
     * Supports: pong, ping, test, ESPlist, subscribe, unsubscribe, sprinkler commands.
     */
    ws.on("message", (messageAsString: any) => {
      // log(__logFile, 'received: %s', messageAsString);
      let message = JSON.parse(messageAsString.toString());

      const metadata = clients.get(ws)!;
      if (metadata) metadata.lastMessage = Date.now();

      switch (message.command) {
        case "pong":
          if (metadata) log(__logFile, "pong from:", metadata.id);
          break;

        case "ping":
          ws.send(JSON.stringify({ command: "pong" }));
          break;
        case "test":
          handleTestMessage(message, metadata);
          break;
        case "ESPlist":
          handleESPlistMessage(message, metadata);
          break;
        case "subscribe":
          log(__logFile, `client subscribing to ${message.topic}`);
          metadata.subscriptions.push(message.topic);
          ws.send(JSON.stringify({ command: "subscribed to " + message.topic }));
          break;
        case "unsubscribe":
          log(__logFile, `client unsubscribing to ${message.topic}`);
          metadata.subscriptions = metadata.subscriptions.filter((sub: string) => sub != message.topic);
          ws.send(JSON.stringify({ command: "unsubscribed from " + message.topic }));
          break;
        case "sprinkler":
          log(__logFile, `sending ${JSON.stringify(message.data)} to sprinkler esp`);
          sendSprinklerMessage(message.data);
          break;
        default:
          log(__logFile, `unknown ${JSON.stringify(message)}`);
          break;
      }
      clients.set(ws, metadata);
    });

    /**
     * Handle WebSocket errors by logging them to console.
     */
    ws.on("error", console.error);

    /**
     * Handle client disconnections by cleaning up metadata and logging.
     */
    ws.on("close", function () {
      clients.delete(ws);
      log(__logFile, "ws closed");
    });
  });
}
