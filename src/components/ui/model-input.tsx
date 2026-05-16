"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface ModelGroup {
  label: string;
  models: string[];
}

const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
  },
  {
    label: "Anthropic",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3.5-sonnet", "claude-3-haiku"],
  },
  {
    label: "阿里云 (通义千问)",
    models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-max-longcontext"],
  },
  {
    label: "智谱 (GLM)",
    models: ["glm-4", "glm-4-flash", "glm-4-plus"],
  },
  {
    label: "月之暗面 (Moonshot)",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  },
  {
    label: "小米 (MiLM)",
    models: ["mi-llm", "mi-llm-pro"],
  },
  {
    label: "MiniMax",
    models: ["abab6.5s-chat", "abab6.5-chat", "abab5.5-chat"],
  },
];

interface ModelInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ModelInput({ id, value, onChange, placeholder, className }: ModelInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return MODEL_GROUPS;
    const q = search.toLowerCase();
    return MODEL_GROUPS
      .map((g) => ({
        ...g,
        models: g.models.filter((m) => m.toLowerCase().includes(q)),
      }))
      .filter((g) => g.models.length > 0);
  }, [search]);

  function select(model: string) {
    onChange(model);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setSearch(value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className={cn("bg-white/5", className)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.map((group) => (
            <div key={group.label}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {group.label}
              </div>
              {group.models.map((model) => (
                <button
                  key={model}
                  onClick={() => select(model)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2",
                    model === value
                      ? "bg-primary/10 text-primary"
                      : "text-popover-foreground hover:bg-white/5"
                  )}
                >
                  <Search className="size-3 text-muted-foreground shrink-0" />
                  <code className="text-xs">{model}</code>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
