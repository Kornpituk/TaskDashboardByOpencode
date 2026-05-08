'use client';

import { useEffect, useCallback, useState } from 'react';

class OrchestratorSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  public isConnected: boolean = false;

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081/api/orchestrator/ws';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.isConnected = true;
      this.emit('__connected', {});
    };
    this.ws.onclose = () => {
      this.isConnected = false;
      this.emit('__disconnected', {});
      this.reconnect();
    };
    this.ws.onerror = () => {
      this.ws?.close();
    };
    this.ws.onmessage = (event) => this.handleMessage(event);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  on(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  send(type: string, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const msg = JSON.parse(event.data);
      const { type, payload } = msg;
      this.listeners.get(type)?.forEach(cb => cb(payload));
    } catch {
      // ignore malformed messages
    }
  }

  private reconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private emit(type: string, data: any): void {
    this.listeners.get(type)?.forEach(cb => cb(data));
  }
}

let singleton: OrchestratorSocket | null = null;
function getSocket(url?: string): OrchestratorSocket {
  if (!singleton) {
    singleton = new OrchestratorSocket(url);
  }
  return singleton;
}

export function useOrchestratorSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    const unsubConnected = socket.on('__connected', () => setIsConnected(true));
    const unsubDisconnected = socket.on('__disconnected', () => setIsConnected(false));
    socket.connect();
    return () => {
      unsubConnected();
      unsubDisconnected();
    };
  }, [socket]);

  const subscribe = useCallback(
    (type: string, callback: (data: any) => void) => socket.on(type, callback),
    [socket]
  );

  const send = useCallback(
    (type: string, payload: any) => socket.send(type, payload),
    [socket]
  );

  return { isConnected, subscribe, send };
}
