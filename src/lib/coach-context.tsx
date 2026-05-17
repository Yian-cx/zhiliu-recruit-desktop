"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface CoachContextValue {
  messages: Message[];
  isOpen: boolean;
  isLoading: boolean;
  conversationId: string | null;
  conversations: ConversationSummary[];
  toggle: () => void;
  open: () => void;
  close: () => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
  newConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  isMaximized: boolean;
  toggleMaximize: () => void;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function useCoach() {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error("useCoach must be used within CoachProvider");
  return ctx;
}

export function CoachProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/career-coach/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const toggle = useCallback(() => setIsOpen((v) => { if (v) { setIsMaximized(false); } return !v; }), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => { setIsOpen(false); setIsMaximized(false); }, []);
  const toggleMaximize = useCallback(() => setIsMaximized((v) => !v), []);

  const clearMessages = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
  }, []);

  const newConversation = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    try {
      const res = await fetch(`/api/career-coach/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setConversationId(data.id);
      }
    } catch {}
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/career-coach/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (conversationId === id) {
          setMessages([]);
          setConversationId(null);
        }
        fetchConversations();
      }
    } catch {}
  }, [conversationId, fetchConversations]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...updated, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/career-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          conversationId: conversationId,
        }),
        signal: controller.signal,
      });

      // Track conversation id from header
      const newConvId = res.headers.get("X-Conversation-Id");
      if (newConvId && !conversationId) {
        setConversationId(newConvId);
      }

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: err.error || "AI 服务暂不可用，请稍后重试" };
          return copy;
        });
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: buffer };
          return copy;
        });
      }

      // Refresh conversation list after message exchange
      fetchConversations();
    } catch (error: any) {
      if (error.name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "网络错误，请重试" };
        return copy;
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, conversationId, fetchConversations]);

  return (
    <CoachContext.Provider value={{
      messages, isOpen, isLoading, conversationId, conversations,
      toggle, open, close, clearMessages, sendMessage,
      newConversation, loadConversation, deleteConversation,
      isMaximized, toggleMaximize,
    }}>
      {children}
    </CoachContext.Provider>
  );
}
