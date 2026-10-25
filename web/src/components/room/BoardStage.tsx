import { useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/solid";
import { useLiveRoom } from "../../lib/liveRoom";

const CARD_COLORS = ["", "pink", "lime", "sky", "gold", "violet"];

export default function BoardStage() {
  const { state, sendBoard } = useLiveRoom();
  const board = state?.board;

  const [addTo, setAddTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [colTitle, setColTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const dragCard = useRef<string | null>(null);

  if (!board) {
    return (
      <section className="room-main">
        <div className="library-empty">Загрузка доски…</div>
      </section>
    );
  }

  const cardsOf = (columnId: string) => board.cards.filter((c) => c.columnId === columnId);

  const addCard = (columnId: string) => {
    const text = draft.trim();
    if (!text) return;
    sendBoard({ op: "addCard", columnId, text, color });
    setDraft("");
    setColor("");
    setAddTo(null);
  };

  const saveEdit = (cardId: string) => {
    const text = editText.trim();
    if (text) sendBoard({ op: "editCard", cardId, text });
    setEditing(null);
    setEditText("");
  };

  const saveRename = (columnId: string) => {
    const title = colTitle.trim();
    if (title) sendBoard({ op: "renameColumn", columnId, title });
    setRenaming(null);
    setColTitle("");
  };

  const onDrop = (e: DragEvent, columnId: string) => {
    e.preventDefault();
    const cardId = dragCard.current || e.dataTransfer.getData("text/plain");
    dragCard.current = null;
    if (cardId) sendBoard({ op: "moveCard", cardId, columnId });
  };

  return (
    <section className="room-main board-stage">
      <div className="board-scroll">
        {board.columns.map((col) => (
          <div
            key={col.id}
            className="board-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="board-col-head">
              {renaming === col.id ? (
                <input
                  className="input board-col-input"
                  autoFocus
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  onBlur={() => saveRename(col.id)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename(col.id)}
                />
              ) : (
                <button
                  type="button"
                  className="board-col-title"
                  onDoubleClick={() => { setRenaming(col.id); setColTitle(col.title); }}
                  title="Двойной клик — переименовать"
                >
                  {col.title} <span className="board-col-count">{cardsOf(col.id).length}</span>
                </button>
              )}
              <button
                type="button"
                className="board-col-del"
                onClick={() => sendBoard({ op: "delColumn", columnId: col.id })}
                title="Удалить колонку"
              >
                <TrashIcon />
              </button>
            </div>

            <div className="board-cards">
              {cardsOf(col.id).map((card) => (
                <div
                  key={card.id}
                  className={`board-card${card.color ? ` c-${card.color}` : ""}`}
                  draggable={editing !== card.id}
                  onDragStart={(e) => {
                    dragCard.current = card.id;
                    e.dataTransfer.setData("text/plain", card.id);
                  }}
                >
                  {editing === card.id ? (
                    <textarea
                      className="input board-card-edit"
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(card.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(card.id); }
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <>
                      <p className="board-card-text">{card.text}</p>
                      <div className="board-card-foot">
                        <span className="board-card-author">@{card.authorName || "?"}</span>
                        <span className="board-card-actions">
                          <button
                            type="button"
                            onClick={() => { setEditing(card.id); setEditText(card.text); }}
                            title="Редактировать"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendBoard({ op: "delCard", cardId: card.id })}
                            title="Удалить"
                          >
                            <XMarkIcon />
                          </button>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {addTo === col.id ? (
              <div className="board-add">
                <textarea
                  className="input board-card-edit"
                  autoFocus
                  rows={2}
                  placeholder="Текст карточки…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(col.id); }
                    if (e.key === "Escape") { setAddTo(null); setDraft(""); }
                  }}
                />
                <div className="board-add-row">
                  <div className="board-colors">
                    {CARD_COLORS.map((c) => (
                      <button
                        key={c || "none"}
                        type="button"
                        className={`board-color${c ? ` c-${c}` : ""}${color === c ? " on" : ""}`}
                        onClick={() => setColor(c)}
                        aria-label={c || "без цвета"}
                      />
                    ))}
                  </div>
                  <div className="board-add-btns">
                    <button type="button" className="btn btn-ghost sm" onClick={() => { setAddTo(null); setDraft(""); }}>
                      Отмена
                    </button>
                    <button type="button" className="btn btn-primary sm" onClick={() => addCard(col.id)} disabled={!draft.trim()}>
                      Добавить
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" className="board-add-btn" onClick={() => { setAddTo(col.id); setDraft(""); setColor(""); }}>
                <PlusIcon /> Карточка
              </button>
            )}
          </div>
        ))}

        <div className="board-col board-col-new">
          {addingColumn ? (
            <input
              className="input"
              autoFocus
              placeholder="Название колонки"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              onBlur={() => { if (newColumn.trim()) sendBoard({ op: "addColumn", title: newColumn }); setAddingColumn(false); setNewColumn(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { if (newColumn.trim()) sendBoard({ op: "addColumn", title: newColumn }); setAddingColumn(false); setNewColumn(""); } }}
            />
          ) : (
            <button type="button" className="board-add-col" onClick={() => setAddingColumn(true)}>
              <ViewColumnsIcon /> Добавить колонку
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
