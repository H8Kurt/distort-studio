import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api, getSocket } from "../../lib/api";
import { usePlayer, type PlayerTrack } from "../../lib/player";
import {
  LiveRoomContext,
  type BoardOp,
  type LiveRoomContextValue,
  type RoomControl,
  type RoomDetail,
  type RoomState,
  type WatchAction,
} from "../../lib/liveRoom";
import type { RoomMemberInfo, RoomMode } from "../../types";

interface LiveRoomProviderProps {
  children: ReactNode;
  currentUserId: number;
}

export default function LiveRoomProvider({ children, currentUserId }: LiveRoomProviderProps) {
  const player = usePlayer();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [members, setMembers] = useState<RoomMemberInfo[]>([]);
  const [state, setState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);

  const roomIdRef = useRef<number | null>(null);
  const syncRef = useRef(player.syncState);
  const lockRef = useRef(player.setLocked);
  const snapshotRef = useRef<{ queue: PlayerTrack[]; index: number } | null>(null);
  const playerQueueRef = useRef(player.queue);
  const playerIndexRef = useRef(player.index);

  useEffect(() => { syncRef.current = player.syncState; }, [player.syncState]);
  useEffect(() => { lockRef.current = player.setLocked; }, [player.setLocked]);
  useEffect(() => { playerQueueRef.current = player.queue; }, [player.queue]);
  useEffect(() => { playerIndexRef.current = player.index; }, [player.index]);

  const applyState = useCallback((s: RoomState) => {
    setState(s);
    // Плеер синхронизируем только в музыкальной комнате — в остальных режимах он остаётся личным
    if (s.mode === "music") {
      syncRef.current({
        queue: s.queue,
        index: s.index,
        playing: s.playing,
        position: s.position,
      });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    const id = roomIdRef.current;
    if (id != null) {
      try {
        getSocket().emit("room:leave", { roomId: id });
      } catch {
        /* ignore */
      }
    }
    roomIdRef.current = null;
    setRoom(null);
    setMembers([]);
    setState(null);
    lockRef.current(false);

    // Возвращаем личную очередь, которая была до входа в музыкальную комнату
    const snap = snapshotRef.current;
    snapshotRef.current = null;
    if (snap && snap.queue.length) {
      syncRef.current({ queue: snap.queue, index: snap.index, playing: false });
    }
  }, []);

  const joinRoom = useCallback(
    async (id: number) => {
      const detail = await api.get<RoomDetail>(`/api/rooms/${id}`);
      const prev = roomIdRef.current;
      if (prev != null && prev !== id) {
        try {
          getSocket().emit("room:leave", { roomId: prev });
        } catch {
          /* ignore */
        }
      }
      const mode: RoomMode = detail.mode || detail.state?.mode || "music";
      if (mode === "music" && prev == null) {
        snapshotRef.current = {
          queue: playerQueueRef.current,
          index: playerIndexRef.current,
        };
        lockRef.current(true);
      } else if (mode !== "music") {
        // вышли из музыкальной комнаты — вернуть управление плеером
        lockRef.current(false);
      }
      roomIdRef.current = id;
      setRoom(detail);
      try {
        getSocket().emit("room:join", { roomId: id });
      } catch {
        /* ignore */
      }
      if (detail.state) applyState(detail.state);
    },
    [applyState]
  );

  const emitRoom = useCallback((event: string, payload?: Record<string, unknown>) => {
    const id = roomIdRef.current;
    if (id == null) return;
    getSocket().emit(event, { roomId: id, ...(payload || {}) });
  }, []);

  const control = useCallback(
    (action: RoomControl) => {
      if (!room || room.hostId !== currentUserId) return;
      emitRoom("room:control", action as unknown as Record<string, unknown>);
    },
    [room, currentUserId, emitRoom]
  );

  const sendWatch = useCallback(
    (action: WatchAction) => emitRoom("room:watch", action as unknown as Record<string, unknown>),
    [emitRoom]
  );

  const sendBoard = useCallback(
    (op: BoardOp) => emitRoom("room:board", op as unknown as Record<string, unknown>),
    [emitRoom]
  );

  const takePencil = useCallback(() => emitRoom("room:draw:lock"), [emitRoom]);
  const releasePencil = useCallback(() => emitRoom("room:draw:lock", { release: true }), [emitRoom]);
  const commitDraw = useCallback((image: string) => emitRoom("room:draw:commit", { image }), [emitRoom]);

  const sendChat = useCallback((text: string) => emitRoom("room:chat", { text }), [emitRoom]);
  const sendReaction = useCallback((emoji: string) => emitRoom("room:reaction", { emoji }), [emitRoom]);
  const sendCursor = useCallback((x: number, y: number) => emitRoom("room:cursor", { x, y }), [emitRoom]);

  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      if (roomIdRef.current != null) socket.emit("room:join", { roomId: roomIdRef.current });
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: RoomState) => {
      if (!s || roomIdRef.current == null || s.roomId !== roomIdRef.current) return;
      applyState(s);
    };
    const onPresence = (p: { roomId: number; members: RoomMemberInfo[] }) => {
      if (p.roomId === roomIdRef.current) setMembers(p.members || []);
    };
    const onMeta = (r: RoomDetail) => {
      setRoom((prev) => (prev && prev.id === r.id ? { ...prev, ...r } : prev));
    };
    const onMembersChanged = async (p: { roomId: number }) => {
      if (p.roomId !== roomIdRef.current) return;
      try {
        const detail = await api.get<RoomDetail>(`/api/rooms/${p.roomId}`);
        setRoom(detail);
      } catch {
        /* ignore */
      }
    };
    const onClosed = ({ roomId }: { roomId: number }) => {
      if (roomId !== roomIdRef.current) return;
      leaveRoom();
      window.dispatchEvent(new CustomEvent("distort:room-closed", { detail: { roomId } }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onState);
    socket.on("room:presence", onPresence);
    socket.on("room:meta", onMeta);
    socket.on("room:members-changed", onMembersChanged);
    socket.on("room:closed", onClosed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onState);
      socket.off("room:presence", onPresence);
      socket.off("room:meta", onMeta);
      socket.off("room:members-changed", onMembersChanged);
      socket.off("room:closed", onClosed);
    };
  }, [applyState, leaveRoom]);

  // На размонтировании снимаем блокировку плеера
  useEffect(() => () => { lockRef.current(false); }, []);

  const isHost = !!room && room.hostId === currentUserId;
  const mode: RoomMode | null = room?.mode || state?.mode || null;

  const value = useMemo<LiveRoomContextValue>(
    () => ({
      room,
      members,
      state,
      mode,
      inRoom: !!room,
      connected,
      isHost,
      joinRoom,
      leaveRoom,
      control,
      sendWatch,
      sendBoard,
      takePencil,
      releasePencil,
      commitDraw,
      sendChat,
      sendReaction,
      sendCursor,
    }),
    [room, members, state, mode, connected, isHost, joinRoom, leaveRoom, control, sendWatch, sendBoard, takePencil, releasePencil, commitDraw, sendChat, sendReaction, sendCursor]
  );

  return <LiveRoomContext.Provider value={value}>{children}</LiveRoomContext.Provider>;
}
