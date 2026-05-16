"use client";

import { useRef, useEffect, useState } from "react";
import { useCoach } from "@/lib/coach-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Send,
  Trash2,
  Bot,
  User,
  Loader2,
  X,
  Zap,
  Plus,
  History,
  MessageSquare,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { MarkdownMessage } from "@/components/ui/markdown-message";

export function CoachSidebar() {
  const {
    messages, isOpen, isLoading, conversationId, conversations,
    toggle, clearMessages, sendMessage,
    newConversation, loadConversation, deleteConversation,
    isMaximized, toggleMaximize,
  } = useCoach();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const currentConv = conversations.find((c) => c.id === conversationId);

  return (
    <div
      className={cn(
        "flex flex-col border-l border-border bg-background shrink-0 transition-all duration-300 overflow-hidden",
        !isOpen && "w-0 border-l-0",
        isOpen && !isMaximized && "w-[380px]",
        isOpen && isMaximized && "flex-1"
      )}
    >
      {/* Header */}
      <div className="flex flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-sky-500">
              <Zap className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {currentConv ? currentConv.title : "职业策划空间"}
              </h3>
              <p className="text-[10px] text-muted-foreground">AI 职业顾问</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isMaximized ? "还原" : "最大化"}
            >
              {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showHistory
                  ? "bg-sky-500/10 text-sky-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="历史对话"
            >
              <History className="size-4" />
            </button>
            <button
              onClick={newConversation}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="新对话"
            >
              <Plus className="size-4" />
            </button>
            <button
              onClick={toggle}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="收起面板"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="border-t border-border/50 max-h-48 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                暂无历史对话
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer group text-sm",
                    conv.id === conversationId && "bg-sky-500/5"
                  )}
                  onClick={() => { loadConversation(conv.id); setShowHistory(false); }}
                >
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {conv._count.messages}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("删除这条对话？")) deleteConversation(conv.id);
                    }}
                    className="p-0.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="size-16 rounded-2xl flex items-center justify-center bg-sky-400/10">
              <Zap className="size-8 text-sky-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-foreground">你好，我是你的专属导师</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
                我会陪你一步步梳理情绪、排除不喜欢的岗位、发掘你的兴趣和优势，找到最适合你的发展方向。
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="size-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 bg-sky-500">
                <Bot className="size-3.5 text-white" />
              </div>
            )}
            {msg.role === "assistant" ? (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md px-4 py-3 bg-muted/60 text-foreground">
                {msg.content ? (
                  <MarkdownMessage
                    content={msg.content}
                    streaming={isLoading && i === messages.length - 1}
                  />
                ) : isLoading && i === messages.length - 1 ? (
                  <span className="flex items-center gap-1 py-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500/40 animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500/40 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500/40 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words bg-sky-500 text-white">
                {msg.content}
              </div>
            )}
            {msg.role === "user" && (
              <div className="size-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 bg-muted">
                <User className="size-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的想法..."
            rows={2}
            disabled={isLoading}
            className="min-h-[44px] max-h-[120px] resize-none text-sm bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-sky-400 rounded-xl"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 size-11 rounded-xl"
            variant={input.trim() && !isLoading ? "default" : "outline"}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
