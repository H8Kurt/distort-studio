import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PhotoIcon,
  CubeTransparentIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  FilmIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  QrCodeIcon,
} from "@heroicons/react/24/solid";
import { api, API_URL } from "../lib/api";
import Modal from "../components/ui/Modal";
import { useConfirm } from "../components/ui/confirm";
import type { Asset, AssetFileType, Order, OrderCreateResponse, User } from "../types";

interface MarketplacePageProps {
  currentUser: User;
}

const CATEGORIES = ["Все", "Сэмплы", "Пресеты", "Графика", "3D", "Другое"];

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  canceled: "Отменён",
  refunded: "Возврат",
  failed: "Ошибка",
};

function iconFor(type: AssetFileType) {
  switch (type) {
    case "image":
      return PhotoIcon;
    case "video":
      return FilmIcon;
    case "3d":
      return CubeTransparentIcon;
    case "audio":
      return MusicalNoteIcon;
    default:
      return MusicalNoteIcon;
  }
}

function fileUrl(abs?: string | null): string {
  if (!abs) return "";
  return abs.startsWith("http") ? abs : `${API_URL}${abs}`;
}

export default function MarketplacePage({ currentUser }: MarketplacePageProps) {
  const confirm = useConfirm();
  const [tab, setTab] = useState<"shop" | "purchases">("shop");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [sort, setSort] = useState<"new" | "pop">("new");
  const [mine, setMine] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [notice, setNotice] = useState("");
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [payOrder, setPayOrder] = useState<Order | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "Все") params.set("category", category);
      params.set("sort", sort === "pop" ? "popular" : "new");
      if (mine) params.set("owner", "me");

      const data = await api.get<Asset[]>(`/api/assets?${params.toString()}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, mine, flash]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await api.get<Order[]>("/api/orders?role=buyer");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Ошибка загрузки покупок");
    } finally {
      setOrdersLoading(false);
    }
  }, [flash]);

  // debounce поиска
  useEffect(() => {
    if (tab !== "shop") return;
    const t = window.setTimeout(load, 300);
    return () => window.clearTimeout(t);
  }, [load, tab]);

  useEffect(() => {
    if (tab === "purchases") loadOrders();
  }, [tab, loadOrders]);

  const like = async (asset: Asset) => {
    try {
      const { likesCount } = await api.post<{ likesCount: number }>(
        `/api/assets/${asset.id}/like`
      );
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, likesCount } : a)));
    } catch (err) {
      flash(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const download = async (asset: Asset) => {
    try {
      const { url } = await api.post<{ url: string }>(`/api/assets/${asset.id}/download`);
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, downloadsCount: (a.downloadsCount || 0) + 1 } : a))
      );
      window.open(fileUrl(url), "_blank", "noopener,noreferrer");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Ошибка скачивания");
    }
  };

  const buy = async (asset: Asset) => {
    setBuyingId(asset.id);
    try {
      const res = await api.post<OrderCreateResponse>("/api/orders", { assetId: asset.id });
      if (res.alreadyOwned) {
        setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isPurchased: true } : a)));
        flash("Покупка уже оформлена");
        return;
      }
      setPayOrder(res.order);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Не удалось создать заказ");
    } finally {
      setBuyingId(null);
    }
  };

  const markPurchased = (order: Order) => {
    setPayOrder(order);
    setAssets((prev) => prev.map((a) => (a.id === order.assetId ? { ...a, isPurchased: true } : a)));
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    flash("Оплата прошла — покупка оформлена");
  };

  const remove = async (asset: Asset) => {
    const ok = await confirm({
      title: "Удалить ассет",
      message: `Удалить «${asset.title}»? Действие необратимо.`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/assets/${asset.id}`);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      flash("Ассет удалён");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const total = assets.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">market // сообщество</span>
          <h2 className="page-title">Магазин ассетов</h2>
          <span className="page-sub">Сэмплы, пресеты и графика от сообщества {currentUser.username}.</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowSell(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} /> Продать ассет
          </button>
        </div>
      </div>

      {notice && (
        <div className="badge badge-primary" style={{ alignSelf: "flex-start" }}>
          {notice}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button className={`chip${tab === "shop" ? " active" : ""}`} onClick={() => setTab("shop")}>
          Магазин
        </button>
        <button
          className={`chip${tab === "purchases" ? " active" : ""}`}
          onClick={() => setTab("purchases")}
        >
          Мои покупки
        </button>
      </div>

      {tab === "shop" ? (
        <>
          <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <MagnifyingGlassIcon
                style={{
                  width: 16,
                  height: 16,
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Поиск ассетов…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <select
              className="input"
              style={{ width: 170 }}
              value={sort}
              onChange={(e) => setSort(e.target.value as "new" | "pop")}
            >
              <option value="new">Сначала новые</option>
              <option value="pop">Популярные</option>
            </select>

            <button
              className={`btn btn-sm ${mine ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMine((v) => !v)}
            >
              Только мои
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip${category === c ? " active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
            <span className="text-text-tertiary" style={{ marginLeft: "auto", alignSelf: "center", fontSize: "0.8rem" }}>
              {total} лотов
            </span>
          </div>

          {loading ? (
            <div className="grid-auto">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card">
                  <div className="skeleton" style={{ height: 130, marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 16, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: "70%" }} />
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="card empty-state">
              <h3>Ничего не найдено</h3>
              <p className="text-text-secondary" style={{ marginTop: 4 }}>
                Попробуйте другой запрос или выложите свой первый ассет.
              </p>
            </div>
          ) : (
            <div className="grid-auto">
              {assets.map((asset) => {
                const Icon = iconFor(asset.fileType);
                const owner = asset.UserId === currentUser.id;
                const thumb = asset.fileType === "image" ? fileUrl(asset.thumbUrl || asset.fileUrl) : "";
                const canDownload = owner || asset.isFree || asset.isPurchased;

                return (
                  <article key={asset.id} className="card card-hover animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className="feed-thumb" style={{ height: 130 }}>
                      {thumb ? (
                        <img src={thumb} alt={asset.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <Icon />
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: "1rem" }}>{asset.title}</h3>
                      <p className="text-text-secondary line-clamp-2" style={{ fontSize: "0.84rem", marginTop: 2 }}>
                        {asset.description || "Без описания"}
                      </p>
                    </div>

                    {asset.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {asset.tags.map((t) => (
                          <span key={t} className="badge badge-neutral">#{t}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="text-text-tertiary">
                      <span style={{ fontSize: "0.78rem" }}>
                        <HeartIcon style={{ width: 12, height: 12, display: "inline" }} /> {asset.likesCount ?? 0}
                      </span>
                      <span style={{ fontSize: "0.78rem" }}>
                        <ArrowDownTrayIcon style={{ width: 12, height: 12, display: "inline" }} /> {asset.downloadsCount ?? 0}
                      </span>
                      <span style={{ fontSize: "0.75rem", marginLeft: "auto" }}>
                        @{asset.author?.username || "unknown"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                      <span style={{ fontWeight: 800, color: asset.isFree ? "var(--success)" : "var(--accent-primary)" }}>
                        {asset.isFree ? "Бесплатно" : `${asset.price} ₽`}
                      </span>

                      <div style={{ display: "flex", gap: 6 }}>
                        {!owner && (
                          <button className="btn btn-ghost btn-sm" onClick={() => like(asset)} aria-label="Лайк">
                            <HeartIcon style={{ width: 15, height: 15 }} />
                          </button>
                        )}

                        {owner && (
                          <button className="btn btn-danger btn-sm" onClick={() => remove(asset)} aria-label="Удалить">
                            <TrashIcon style={{ width: 15, height: 15 }} />
                          </button>
                        )}

                        {canDownload ? (
                          <button className="btn btn-primary btn-sm" onClick={() => download(asset)}>
                            <ArrowDownTrayIcon style={{ width: 15, height: 15 }} /> Скачать
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => buy(asset)}
                            disabled={buyingId === asset.id}
                          >
                            <CreditCardIcon style={{ width: 15, height: 15 }} />
                            {buyingId === asset.id ? "Готовим…" : "Купить"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <PurchasesList
          orders={orders}
          loading={ordersLoading}
          onDownload={download}
          onContinue={(order) => setPayOrder(order)}
        />
      )}

      <Modal open={!!payOrder} onClose={() => setPayOrder(null)} title="Оплата по СБП" maxWidth={420}>
        {payOrder && (
          <PayPanel
            order={payOrder}
            onPaid={markPurchased}
            onDownload={() => payOrder.asset && download(payOrder.asset)}
          />
        )}
      </Modal>

      {showSell && (
        <SellModal
          onClose={() => setShowSell(false)}
          onCreated={(asset) => {
            setAssets((prev) => [asset, ...prev]);
            setShowSell(false);
            flash("Ассет выставлен на продажу");
          }}
        />
      )}
    </div>
  );
}

interface PurchasesListProps {
  orders: Order[];
  loading: boolean;
  onDownload: (asset: Asset) => void;
  onContinue: (order: Order) => void;
}

function PurchasesList({ orders, loading, onDownload, onContinue }: PurchasesListProps) {
  if (loading) {
    return (
      <div className="grid-auto">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ height: 16, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: "60%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card empty-state">
        <h3>Покупок пока нет</h3>
        <p className="text-text-secondary" style={{ marginTop: 4 }}>
          Здесь появятся купленные ассеты.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {orders.map((order) => {
        const asset = order.asset;
        const paid = order.status === "paid";
        return (
          <div
            key={order.id}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>{asset?.title || `Ассет #${order.assetId}`}</div>
              <div className="text-text-tertiary" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                {order.seller ? `@${order.seller.username} · ` : ""}
                {new Date(order.createdAt || Date.now()).toLocaleDateString("ru-RU")}
              </div>
            </div>

            <span className={`badge ${paid ? "badge-success" : "badge-neutral"}`}>
              {STATUS_LABEL[order.status]}
            </span>
            <span style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>{order.amount} ₽</span>

            {paid && asset ? (
              <button className="btn btn-primary btn-sm" onClick={() => onDownload(asset)}>
                <ArrowDownTrayIcon style={{ width: 15, height: 15 }} /> Скачать
              </button>
            ) : order.status === "pending" ? (
              <button className="btn btn-secondary btn-sm" onClick={() => onContinue(order)}>
                <QrCodeIcon style={{ width: 15, height: 15 }} /> К оплате
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface PayPanelProps {
  order: Order;
  onPaid: (order: Order) => void;
  onDownload: () => void;
}

function PayPanel({ order, onPaid, onDownload }: PayPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Order["status"]>(order.status);

  const isMock = order.provider === "mock";
  const paid = status === "paid";

  // Опрос статуса (для реального провайдера — вебхук может прийти с задержкой)
  useEffect(() => {
    if (paid) return;
    let active = true;
    const tick = async () => {
      try {
        const fresh = await api.post<Order>(`/api/orders/${order.id}/sync`);
        if (active) setStatus(fresh.status);
      } catch {
        /* тихо */
      }
    };
    const t = window.setInterval(tick, 4000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [order.id, paid]);

  const confirmMock = async () => {
    setBusy(true);
    setError("");
    try {
      const fresh = await api.post<Order>(`/api/orders/${order.id}/mock-pay`);
      setStatus(fresh.status);
      onPaid(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подтвердить оплату");
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center" }}>
        <CheckCircleIcon style={{ width: 44, height: 44, color: "var(--success)" }} />
        <div>
          <div style={{ fontWeight: 700 }}>Оплата прошла</div>
          <p className="text-text-secondary" style={{ fontSize: "0.85rem", marginTop: 4 }}>
            Ассет «{order.asset?.title || `#${order.assetId}`}» доступен для скачивания.
          </p>
        </div>
        <button className="btn btn-primary w-full" onClick={onDownload}>
          <ArrowDownTrayIcon style={{ width: 16, height: 16 }} /> Скачать ассет
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center" }}>
      <div>
        <div style={{ fontWeight: 700 }}>{order.asset?.title || `Ассет #${order.assetId}`}</div>
        <div className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>К оплате: {order.amount} ₽</div>
      </div>

      {order.qrData ? (
        <img
          src={order.qrData}
          alt="QR для оплаты"
          style={{ width: 220, height: 220, borderRadius: 12, background: "#fff", padding: 8 }}
        />
      ) : (
        <QrCodeIcon style={{ width: 64, height: 64, opacity: 0.4 }} />
      )}

      <p className="text-text-secondary" style={{ fontSize: "0.82rem" }}>
        Отсканируйте QR-код в приложении банка (СБП) или откройте страницу оплаты.
      </p>

      {order.confirmationUrl && !isMock && (
        <a className="btn btn-secondary w-full" href={order.confirmationUrl} target="_blank" rel="noreferrer">
          Открыть страницу оплаты
        </a>
      )}

      {isMock && (
        <button className="btn btn-primary w-full" onClick={confirmMock} disabled={busy}>
          {busy ? "Обрабатываем…" : "Я оплатил (демо)"}
        </button>
      )}

      <button
        className="btn btn-ghost w-full"
        onClick={async () => {
          try {
            const fresh = await api.post<Order>(`/api/orders/${order.id}/sync`);
            setStatus(fresh.status);
            if (fresh.status === "paid") onPaid(fresh);
          } catch {
            /* тихо */
          }
        }}
      >
        <ArrowPathIcon style={{ width: 15, height: 15 }} /> Проверить оплату
      </button>

      {error && <div className="badge badge-warning">{error}</div>}
    </div>
  );
}

interface SellModalProps {
  onClose: () => void;
  onCreated: (asset: Asset) => void;
}

function SellModal({ onClose, onCreated }: SellModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("Сэмплы");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Выберите файл ассета");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("description", description);
      form.append("price", price);
      form.append("category", category);
      form.append("tags", tags);
      form.append("isFree", String(Number(price) <= 0));
      const asset = await api.postForm<Asset>("/api/assets", form);
      onCreated(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка публикации");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form
        className="modal-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{ display: "grid", gap: "0.9rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3>Новый ассет</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Закрыть">
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Название</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Описание</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Цена, ₽ (0 = бесплатно)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Категория</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.filter((c) => c !== "Все").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Теги (через запятую)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="lo-fi, drums" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Файл ассета (audio, image, video, архив — до 50 МБ)</label>
          <input
            className="input"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>

        {error && <div className="badge badge-warning">{error}</div>}

        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Публикуем…" : "Опубликовать"}
        </button>
      </form>
    </div>
  );
}
