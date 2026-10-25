import { createContext, useContext } from "react";
import type { PlayerTrack } from "./player";
import type {
  RoomBoardState,
  RoomDrawState,
  RoomMemberInfo,
  RoomMode,
  RoomSummary,
  RoomWatchState,
} from "../types";

/** Состояние комнаты, приходящее с сервера. Поля музыки плоские (для плеера), остальные — по режимам. */
export interface RoomState {
  roomId: number;
  mode: RoomMode;
  hostId: number;
  // музыка
  queue: PlayerTrack[];
  index: number;
  playing: boolean;
  position: number;
  // видео
  watch: RoomWatchState;
  // канбан
  board: RoomBoardState;
  // рисование
  draw: RoomDrawState;
  serverTime: number;
  updatedAt: number;
}

export interface RoomDetail extends RoomSummary {
  members?: Array<{
    id: number;
    userId: number;
    role: "host" | "member";
    user?: { id: number; username: string; avatarUrl?: string | null };
  }>;
  state?: RoomState | null;
}

export type RoomControl =
  | { type: "play"; position?: number }
  | { type: "pause" }
  | { type: "seek"; position: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "index"; index: number }
  | { type: "queue"; queue: PlayerTrack[]; index?: number };

export type WatchAction =
  | { type: "load"; videoId: string }
  | { type: "play"; position?: number }
  | { type: "pause" }
  | { type: "seek"; position: number };

export type BoardOp =
  | { op: "addColumn"; title: string }
  | { op: "renameColumn"; columnId: string; title: string }
  | { op: "delColumn"; columnId: string }
  | { op: "addCard"; columnId: string; text: string; color?: string }
  | { op: "editCard"; cardId: string; text: string }
  | { op: "moveCard"; cardId: string; columnId: string; index?: number }
  | { op: "delCard"; cardId: string };

export interface RoomReaction {
  id: string;
  userId: number;
  username: string;
  emoji: string;
  at: number;
}

export interface RoomCursor {
  userId: number;
  username: string;
  x: number;
  y: number;
  at: number;
}

export interface LiveRoomContextValue {
  room: RoomDetail | null;
  members: RoomMemberInfo[];
  state: RoomState | null;
  mode: RoomMode | null;
  inRoom: boolean;
  connected: boolean;
  isHost: boolean;
  joinRoom: (id: number) => Promise<void>;
  leaveRoom: () => void;
  // музыка
  control: (action: RoomControl) => void;
  // видео
  sendWatch: (action: WatchAction) => void;
  // канбан
  sendBoard: (op: BoardOp) => void;
  // рисование
  takePencil: () => void;
  releasePencil: () => void;
  commitDraw: (image: string) => void;
  // общее
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  sendCursor: (x: number, y: number) => void;
}

export const LiveRoomContext = createContext<LiveRoomContextValue | null>(null);

export function useLiveRoom(): LiveRoomContextValue {
  const ctx = useContext(LiveRoomContext);
  if (!ctx) throw new Error("useLiveRoom must be used within LiveRoomProvider");
  return ctx;
}
