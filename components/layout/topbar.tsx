"use client";

import { Menu } from "lucide-react";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { ProfileMenu } from "@/components/layout/profile-menu";

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/85 px-5 py-3.5 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-mist lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-display text-[17px] text-navy">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsDropdown />
        <ProfileMenu />
      </div>
    </header>
  );
}
