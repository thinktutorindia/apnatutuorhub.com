"use client";

import { create } from "zustand";

interface AdminSidebarState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (val: boolean) => void;
}

export const useAdminSidebarStore = create<AdminSidebarState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (val) => set({ isOpen: val }),
}));
