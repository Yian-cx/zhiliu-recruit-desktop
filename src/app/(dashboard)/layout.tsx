"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CoachProvider, useCoach } from "@/lib/coach-context";
import { CoachSidebar } from "@/components/layout/coach-sidebar";
import { cn } from "@/lib/utils";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { isMaximized } = useCoach();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-y-auto", isMaximized && "hidden")}>
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <CoachSidebar />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <CoachProvider>
        <DashboardInner>{children}</DashboardInner>
      </CoachProvider>
    </SessionProvider>
  );
}
