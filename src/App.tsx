import { useEffect, useState } from "react";

const GREEN = "#2F4538";
const GREEN_DARK = "#1F2F26";
const AMBER = "#C17817";
const IVORY = "#F6F1E7";
const INK = "#23201B";
const LINE = "#DCD3BF";
const RED = "#A23B2E";
const PLUM = "#5B3A52";

type LogEntry = {
  id: string;
  type: "sale" | "restock";
  amount: number;
  memo: string;
  date: string;
  ts: number;
};

type Product = {
  id: string;
  name: string;
  count: number;
  log: LogEntry[];
};

type Item =
  | (Product & { type: "product" })
  | {
      id: string;
      type: "folder";
      name: string;
      products: Product[];
    };

function todayStr() {
  return new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newProductObj(name: string): Product {
  return {
    id: uid(),
    name,
    count: 0,
    log: [],
  };
}

export default function BottleTracker() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeTopId, setActiveTopId] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingType, setCreatingType] = useState<
    "product" | "folder" | null
  >(null);
  const [showAddToFolder, setShowAddToFolder] = useState(false);
  const [folderProductName, setFolderProductName] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("moad-perfume-store-v1");

      if (saved) {
        const data = JSON.parse(saved);
        const list: Item[] = data.items || [];

        setItems(list);

        if (list.length > 0) {
          setActiveTopId(list[0].id);

          if (list[0].type === "folder" && list[0].products.length > 0) {
            setActiveSubId(list[0].products[0].id);
          }
        }
      }
    } catch {
      setError("Couldn't load saved inventory.");
    }

    setLoading(false);
  }, []);

  function persist(list: Item[]) {
    try {
      localStorage.setItem(
        "moad-perfume-store-v1",
        JSON.stringify({ items: list })
      );
    } catch {
      setError("Couldn't save your inventory.");
    }
  }

  function resetCreateUI() {
    setShowNewMenu(false);
    setCreatingType(null);
    setNewProductName("");
    setNewFolderName("");
  }

  function addTopProduct() {
    const name = newProductName.trim();

    if (!name) return;

    const p = {
      ...newProductObj(name),
      type: "product" as const,
    };

    const list = [...items, p];

    setItems(list);
    setActiveTopId(p.id);
    setActiveSubId(null);
    resetCreateUI();
    persist(list);
  }

  function addFolder() {
    const name = newFolderName.trim();

    if (!name) return;

    const f: Item = {
      id: uid(),
      type: "folder",
      name,
      products: [],
    };

    const list = [...items, f];

    setItems(list);
    setActiveTopId(f.id);
    setActiveSubId(null);
    resetCreateUI();
    persist(list);
  }

  function addProductToFolder() {
    const name = folderProductName.trim();

    if (!name) return;

    const newProduct = { ...newProductObj(name), type: "product" as const };
    
    const list = items.map((it) => {
      if (it.id !== activeTopId || it.type !== "folder") {
        return it;
      }

      return {
        ...it,
        products: [...it.products, newProduct],
      };
    });

    setItems(list);

    setActiveSubId(newProduct.id);
    setFolderProductName("");
    setShowAddToFolder(false);

    persist(list);
  }

  function removeTopItem(id: string) {
    const list = items.filter((it) => it.id !== id);

    setItems(list);

    if (activeTopId === id) {
      setActiveTopId(list.length ? list[0].id : null);
      setActiveSubId(
        list.length &&
          list[0].type === "folder" &&
          list[0].products.length
          ? list[0].products[0].id
          : null
      );
    }

    persist(list);
  }

  function removeSubProduct(folderId: string, productId: string) {
    const list = items.map((it) => {
      if (it.id !== folderId || it.type !== "folder") {
        return it;
      }

      return {
        ...it,
        products: it.products.filter((p) => p.id !== productId),
      };
    });

    setItems(list);

    if (activeSubId === productId) {
      const folder = list.find(
        (it) => it.id === folderId && it.type === "folder"
      );

      if (folder && folder.type === "folder") {
        setActiveSubId(
          folder.products.length ? folder.products[0].id : null
        );
      } else {
        setActiveSubId(null);
      }
    }

    persist(list);
  }

  const activeTop =
    items.find((it) => it.id === activeTopId) || null;

  const isFolder =
    activeTop !== null && activeTop.type === "folder";

  const active: Product | null = isFolder
    ? activeTop.type === "folder"
      ? activeTop.products.find((p) => p.id === activeSubId) || null
      : null
    : activeTop && activeTop.type === "product"
    ? activeTop
    : null;

  function applyToActive(updater: (p: Product) => Product) {
    if (!activeTop || !active) return;

    let list: Item[];

    if (isFolder && activeTop.type === "folder") {
      list = items.map((it) => {
        if (it.id !== activeTop.id || it.type !== "folder") {
          return it;
        }

        return {
          ...it,
          products: it.products.map((p) =>
            p.id === active.id ? updater(p) : p
          ),
        };
      });
    } else {
      list = items.map((it): Item =>
        it.id === activeTop.id && it.type === "product"
          ? updater(it)
          : it
      );
    }

    setItems(list);
    persist(list);
  }

  function handleAction(type: "sale" | "restock") {
    if (!active) {
      setError("Add a product first.");
      return;
    }

    const n = Math.abs(parseInt(qty, 10));

    if (!n || n <= 0) {
      setError("Enter how many bottles first.");
      return;
    }

    if (type === "sale" && n > active.count) {
      setError(
        `You only have ${active.count} bottle${
          active.count === 1 ? "" : "s"
        } on hand.`
      );
      return;
    }

    const delta = type === "restock" ? n : -n;

    applyToActive((p) => {
      const newCount = p.count + delta;

      const entry: LogEntry = {
        id: uid(),
        type,
        amount: n,
        memo: note.trim(),
        date: todayStr(),
        ts: Date.now(),
      };

      return {
        ...p,
        count: newCount,
        log: [entry, ...p.log],
      };
    });

    setQty("");
    setNote("");
    setError("");
  }

  function clearActiveHistory() {
    applyToActive((p) => ({
      ...p,
      count: 0,
      log: [],
    }));

    setConfirmClear(false);
  }

  function itemTotal(it: Item) {
    if (it.type === "folder") {
      return it.products.reduce((s, p) => s + p.count, 0);
    }

    return it.count;
  }

  const grandTotal = items.reduce(
    (s, it) => s + itemTotal(it),
    0
  );

  const now = new Date();
  const thisMonthKey = monthKey(now);

  let monthSold = 0;
  let monthRestocked = 0;

  if (active) {
    active.log.forEach((e) => {
      if (monthKey(new Date(e.ts)) === thisMonthKey) {
        if (e.type === "sale") {
          monthSold += e.amount;
        } else {
          monthRestocked += e.amount;
        }
      }
    });
  }

  const visibleLog = active
    ? showAllHistory
      ? active.log
      : active.log.slice(0, 8)
    : [];

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "Georgia, serif",
          color: INK,
        }}
      >
        Loading inventory…
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          "'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
        background: IVORY,
        minHeight: "100vh",
        padding: "28px 18px 60px",
        color: INK,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        button {
          font-family: inherit;
          cursor: pointer;
        }

        button:focus-visible,
        input:focus-visible {
          outline: 2px solid ${AMBER};
          outline-offset: 2px;
        }

        input::placeholder {
          color: #9C9280;
        }

        .chip-row::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div
        style={{
          maxWidth: 440,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 0.5,
              color: GREEN,
              fontWeight: 400,
            }}
          >
            Moad Perfume Store
          </div>

          <div
            style={{
              width: 46,
              height: 2,
              background: AMBER,
              margin: "8px auto 0",
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 0.3,
              color: "#6B6353",
              marginBottom: 2,
            }}
          >
            Bottle inventory
          </div>

          <div
            style={{
              fontSize: 15,
              color: "#8A8271",
            }}
          >
            {items.length > 0
              ? `${grandTotal} bottles across ${
                  items.length
                } ${
                  items.length === 1 ? "entry" : "entries"
                }`
              : "Add your first product to start tracking"}
          </div>
        </div>

        <div
          className="chip-row"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            marginBottom: 12,
            paddingBottom: 4,
          }}
        >
          {items.map((it) => {
            const isActive = it.id === activeTopId;
            const folder = it.type === "folder";

            return (
              <button
                key={it.id}
                onClick={() => {
                  setActiveTopId(it.id);

                  setActiveSubId(
                    folder && it.products.length
                      ? it.products[0].id
                      : null
                  );

                  setError("");
                  setConfirmClear(false);
                  setShowAllHistory(false);
                  setShowAddToFolder(false);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: `1px solid ${
                    isActive
                      ? folder
                        ? PLUM
                        : GREEN
                      : LINE
                  }`,
                  background: isActive
                    ? folder
                      ? PLUM
                      : GREEN
                    : "#FFFEFB",
                  color: isActive ? IVORY : INK,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                }}
              >
                {folder ? "📁 " : ""}
                {it.name} · {itemTotal(it)}
              </button>
            );
          })}
        </div>

        {!showNewMenu ? (
          <button
            onClick={() => setShowNewMenu(true)}
            style={{
              display: "block",
              margin: "0 0 18px",
              padding: "8px 14px",
              borderRadius: 20,
              border: `1px dashed ${AMBER}`,
              background: "transparent",
              color: AMBER,
              fontSize: 14,
            }}
          >
            + Add new
          </button>
        ) : (
          <div
            style={{
              background: "#FFFEFB",
              border: `1px solid ${LINE}`,
              borderRadius: 6,
              padding: 14,
              marginBottom: 18,
            }}
          >
            {!creatingType ? (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#6B6353",
                    marginBottom: 10,
                  }}
                >
                  What do you want to add?
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() =>
                      setCreatingType("product")
                    }
                    style={{
                      flex: 1,
                      minWidth: 140,
                      background: GREEN,
                      color: IVORY,
                      border: "none",
                      borderRadius: 4,
                      padding: "10px 0",
                      fontSize: 14,
                    }}
                  >
                    A single product
                  </button>

                  <button
                    onClick={() =>
                      setCreatingType("folder")
                    }
                    style={{
                      flex: 1,
                      minWidth: 140,
                      background: PLUM,
                      color: IVORY,
                      border: "none",
                      borderRadius: 4,
                      padding: "10px 0",
                      fontSize: 14,
                    }}
                  >
                    📁 A brand with several
                  </button>
                </div>

                <button
                  onClick={resetCreateUI}
                  style={{
                    marginTop: 10,
                    background: "none",
                    border: "none",
                    color: "#9C9280",
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : creatingType === "product" ? (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "#6B6353",
                    marginBottom: 6,
                  }}
                >
                  Name this product
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) =>
                      setNewProductName(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addTopProduct();
                      }
                    }}
                    placeholder="Product name"
                    style={{
                      flex: 1,
                      fontSize: 15,
                      padding: "9px 12px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 4,
                      fontFamily: "inherit",
                      background: IVORY,
                      color: INK,
                    }}
                  />

                  <button
                    onClick={addTopProduct}
                    style={{
                      background: GREEN,
                      color: IVORY,
                      border: "none",
                      borderRadius: 4,
                      padding: "0 16px",
                    }}
                  >
                    Add
                  </button>

                  <button
                    onClick={resetCreateUI}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9C9280",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "#6B6353",
                    marginBottom: 6,
                  }}
                >
                  Name this brand
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) =>
                      setNewFolderName(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addFolder();
                      }
                    }}
                    placeholder="Brand name"
                    style={{
                      flex: 1,
                      fontSize: 15,
                      padding: "9px 12px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 4,
                      fontFamily: "inherit",
                      background: IVORY,
                      color: INK,
                    }}
                  />

                  <button
                    onClick={addFolder}
                    style={{
                      background: PLUM,
                      color: IVORY,
                      border: "none",
                      borderRadius: 4,
                      padding: "0 16px",
                    }}
                  >
                    Add
                  </button>

                  <button
                    onClick={resetCreateUI}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9C9280",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!activeTop ? (
          <div
            style={{
              border: `1px dashed ${LINE}`,
              borderRadius: 6,
              padding: 30,
              textAlign: "center",
              color: "#9C9280",
              fontSize: 14,
            }}
          >
            No product selected. Tap "+ Add new" above to get started.
          </div>
        ) : (
          <>
            {isFolder && activeTop.type === "folder" && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "#6B6353",
                    marginBottom: 8,
                  }}
                >
                  {activeTop.name} — products in this brand
                </div>

                <div
                  className="chip-row"
                  style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    paddingBottom: 4,
                  }}
                >
                  {activeTop.products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveSubId(p.id);
                        setError("");
                        setConfirmClear(false);
                        setShowAllHistory(false);
                      }}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 16,
                        border: `1px solid ${
                          p.id === activeSubId
                            ? AMBER
                            : LINE
                        }`,
                        background:
                          p.id === activeSubId
                            ? AMBER
                            : "#FFFEFB",
                        color:
                          p.id === activeSubId
                            ? "#2B1B04"
                            : INK,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name} · {p.count}
                    </button>
                  ))}

                  {!showAddToFolder && (
                    <button
                      onClick={() =>
                        setShowAddToFolder(true)
                      }
                      style={{
                        padding: "7px 12px",
                        borderRadius: 16,
                        border: `1px dashed ${PLUM}`,
                        background: "transparent",
                        color: PLUM,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Product
                    </button>
                  )}
                </div>

                {showAddToFolder && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <input
                      type="text"
                      value={folderProductName}
                      onChange={(e) =>
                        setFolderProductName(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addProductToFolder();
                        }
                      }}
                      placeholder="Product name"
                      style={{
                        flex: 1,
                        fontSize: 14,
                        padding: "8px 10px",
                        border: `1px solid ${LINE}`,
                        borderRadius: 4,
                        fontFamily: "inherit",
                        background: IVORY,
                        color: INK,
                      }}
                    />

                    <button
                      onClick={addProductToFolder}
                      style={{
                        background: PLUM,
                        color: IVORY,
                        border: "none",
                        borderRadius: 4,
                        padding: "0 14px",
                        fontSize: 13,
                      }}
                    >
                      Add
                    </button>

                    <button
                      onClick={() => {
                        setShowAddToFolder(false);
                        setFolderProductName("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9C9280",
                        fontSize: 13,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {activeTop.products.length === 0 &&
                  !showAddToFolder && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: "#9C9280",
                      }}
                    >
                      No products in this brand yet — tap
                      "+ Product" to add one.
                    </div>
                  )}
              </div>
            )}

            {!active ? (
              isFolder && (
                <div
                  style={{
                    border: `1px dashed ${LINE}`,
                    borderRadius: 6,
                    padding: 24,
                    textAlign: "center",
                    color: "#9C9280",
                    fontSize: 14,
                  }}
                >
                  Select or add a product inside{" "}
                  {activeTop.name} to track it.
                </div>
              )
            ) : (
              <>
                <div
                  style={{
                    background: GREEN,
                    borderRadius: 6,
                    padding: "26px 24px",
                    textAlign: "center",
                    marginBottom: 18,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -30,
                      right: -30,
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: GREEN_DARK,
                      opacity: 0.5,
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        color: "#B9C7BB",
                        fontSize: 13,
                        letterSpacing: 0.4,
                        marginBottom: 6,
                      }}
                    >
                      {active.name} on hand
                    </div>

                    <div
                      style={{
                        color: IVORY,
                        fontSize: 56,
                        fontWeight: 400,
                        lineHeight: 1,
                      }}
                    >
                      {active.count}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#FFFEFB",
                    border: `1px solid ${LINE}`,
                    borderRadius: 6,
                    padding: 18,
                    marginBottom: 18,
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      color: "#6B6353",
                      marginBottom: 6,
                    }}
                  >
                    How many bottles?
                  </label>

                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={qty}
                    onChange={(e) =>
                      setQty(e.target.value)
                    }
                    placeholder="e.g. 2"
                    style={{
                      width: "100%",
                      fontSize: 22,
                      padding: "10px 12px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 4,
                      marginBottom: 10,
                      fontFamily: "inherit",
                      background: IVORY,
                      color: INK,
                    }}
                  />

                  <input
                    type="text"
                    value={note}
                    onChange={(e) =>
                      setNote(e.target.value)
                    }
                    placeholder="Note (optional) — e.g. customer name"
                    style={{
                      width: "100%",
                      fontSize: 14,
                      padding: "9px 12px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 4,
                      marginBottom: 14,
                      fontFamily: "inherit",
                      background: IVORY,
                      color: INK,
                    }}
                  />

                  {error && (
                    <div
                      style={{
                        color: RED,
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() =>
                        handleAction("sale")
                      }
                      style={{
                        flex: 1,
                        background: RED,
                        color: IVORY,
                        border: "none",
                        borderRadius: 4,
                        padding: "14px 0",
                        fontSize: 16,
                      }}
                    >
                      − Sold
                    </button>

                    <button
                      onClick={() =>
                        handleAction("restock")
                      }
                      style={{
                        flex: 1,
                        background: AMBER,
                        color: "#2B1B04",
                        border: "none",
                        borderRadius: 4,
                        padding: "14px 0",
                        fontSize: 16,
                      }}
                    >
                      + Bought
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      border: `1px solid ${LINE}`,
                      borderRadius: 6,
                      padding: "12px 14px",
                      background: "#FFFEFB",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8A8271",
                      }}
                    >
                      Sold this month
                    </div>

                    <div
                      style={{
                        fontSize: 24,
                        color: RED,
                      }}
                    >
                      {monthSold}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      border: `1px solid ${LINE}`,
                      borderRadius: 6,
                      padding: "12px 14px",
                      background: "#FFFEFB",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8A8271",
                      }}
                    >
                      Bought this month
                    </div>

                    <div
                      style={{
                        fontSize: 24,
                        color: AMBER,
                      }}
                    >
                      {monthRestocked}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 13,
                    color: "#6B6353",
                  }}
                >
                  History for {active.name} ({active.log.length})
                </div>

                <div
                  style={{
                    border: `1px solid ${LINE}`,
                    borderRadius: 6,
                    background: "#FFFEFB",
                  }}
                >
                  {active.log.length === 0 ? (
                    <div
                      style={{
                        padding: 20,
                        color: "#9C9280",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      No entries yet. Log a sale or a restock
                      above.
                    </div>
                  ) : (
                    visibleLog.map((entry, i) => (
                      <div
                        key={entry.id}
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          padding: "12px 14px",
                          borderBottom:
                            i === visibleLog.length - 1
                              ? "none"
                              : `1px solid ${LINE}`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 15,
                              color: INK,
                            }}
                          >
                            {entry.type === "sale"
                              ? "Sold"
                              : "Bought"}{" "}
                            {entry.amount}{" "}
                            {entry.amount === 1
                              ? "bottle"
                              : "bottles"}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#9C9280",
                            }}
                          >
                            {entry.date}
                            {entry.memo
                              ? ` · ${entry.memo}`
                              : ""}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 15,
                            color:
                              entry.type === "sale"
                                ? RED
                                : AMBER,
                            fontWeight: 500,
                          }}
                        >
                          {entry.type === "sale"
                            ? "−"
                            : "+"}
                          {entry.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {active.log.length > 8 && (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 10,
                    }}
                  >
                    <button
                      onClick={() =>
                        setShowAllHistory(
                          !showAllHistory
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#6B6353",
                        fontSize: 13,
                        textDecoration: "underline",
                      }}
                    >
                      {showAllHistory
                        ? "Show less"
                        : `Show all ${active.log.length}`}
                    </button>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 24,
                    textAlign: "center",
                    display: "flex",
                    justifyContent: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {!confirmClear ? (
                    <>
                      <button
                        onClick={() =>
                          setConfirmClear(true)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#9C9280",
                          fontSize: 13,
                          textDecoration: "underline",
                        }}
                      >
                        Reset this product's data
                      </button>

                      <button
                        onClick={() =>
                          isFolder
                            ? removeSubProduct(
                                activeTop.id,
                                active.id
                              )
                            : removeTopItem(active.id)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#9C9280",
                          fontSize: 13,
                          textDecoration: "underline",
                        }}
                      >
                        Remove product
                      </button>

                      {isFolder && (
                        <button
                          onClick={() =>
                            removeTopItem(
                              activeTop.id
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#9C9280",
                            fontSize: 13,
                            textDecoration: "underline",
                          }}
                        >
                          Remove whole brand
                        </button>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6B6353",
                      }}
                    >
                      Erase {active.name}'s history?{" "}
                      <button
                        onClick={clearActiveHistory}
                        style={{
                          background: "none",
                          border: "none",
                          color: RED,
                          textDecoration: "underline",
                          marginRight: 10,
                        }}
                      >
                        Yes, reset
                      </button>

                      <button
                        onClick={() =>
                          setConfirmClear(false)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#6B6353",
                          textDecoration: "underline",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
