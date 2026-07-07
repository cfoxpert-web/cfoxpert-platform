"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { useSession } from "@/hooks/use-session";

export function ProfileMenu() {
  const { session, signOut } = useSession();
  if (!session) return null;

  const { user } = session;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-mist">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy to-teal text-[13px] font-semibold text-white">
            {user.avatarInitial}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[13px] font-semibold leading-tight text-navy">{user.name}</span>
            <span className="block text-[11px] leading-tight text-slate-light">{user.role}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-light" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-64 rounded-card border border-line bg-white p-2 shadow-elevation-2"
        >
          <div className="border-b border-line px-3 py-3">
            <div className="text-[13.5px] font-semibold text-navy">{user.name}</div>
            <div className="text-[12px] text-slate-light">{user.email}</div>
            <div className="mt-1 text-[11.5px] text-slate-light">{user.company}</div>
          </div>
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13.5px] text-ink outline-none transition-colors hover:bg-mist"
            >
              <Settings className="h-4 w-4 text-slate" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => signOut()}
            className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13.5px] text-coral outline-none transition-colors hover:bg-mist"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
