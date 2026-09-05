/* =========================================================
   WAREHOUSE MANAGEMENT SYSTEM — DASHBOARD LOGIC
   Vanilla JS only. No backend — all state lives in memory
   and is structured so a real API can be swapped in later
   (see the `api` stub functions marked TODO-BACKEND).
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. DATA MODEL
     --------------------------------------------------------- */

  const CATEGORY_ICONS = {
    "Liquids": "fa-droplet",
    "Vegetables": "fa-carrot",
    "Fruits": "fa-apple-whole",
    "Groceries": "fa-basket-shopping",
    "Snacks": "fa-cookie-bite",
    "Bakery": "fa-egg"
  };

  // Accent colors per category (Liquids: blue, Vegetables: green,
  // Fruits: orange, Groceries: purple, Snacks: red)
  const CATEGORY_COLORS = {
    "Liquids": "#2f6fed",
    "Vegetables": "#17a34a",
    "Fruits": "#f2760f",
    "Groceries": "#7c5cff",
    "Snacks": "#e5484d",
    "Bakery":"#310f10"
  };

  // Colors used only for the Reports page's "category" column
  // (report categories are not warehouse product categories).
  const REPORT_CATEGORY_COLORS = {
    "Inventory": "#2f6fed",
    "Financial": "#17a34a",
    "Customer": "#7c5cff",
    "Orders": "#f2760f"
  };

  function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  }
  function fmtDate(d) {

    if (!d) return "-";

    // If it's a Firestore Timestamp
    if (typeof d.toDate === "function") {
        d = d.toDate();
    }

    // If it's a string like "2026-08-01"
    if (!(d instanceof Date)) {
        d = new Date(d);
    }

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

  let nextId = 1;
  function makeProduct(name, category, quantity, price, expiryOffsetDays) {
    return {
      id: nextId++,
      name,
      category,
      quantity,
      price,
      expiry: daysFromNow(expiryOffsetDays)
    };
  }

  // Core product ledger. expiryOffsetDays < 0 => already expired.
   
  const state = {
    products: [],
    returned: [],
    orders: [],
    reports: [],
    notifications: []
}
  const EXPIRING_THRESHOLD_DAYS = 6; // <= this many days => "expiring soon"

  function isExpired(p) { return daysUntil(p.expiry) < 0; }
  function isExpiringSoon(p) { const d = daysUntil(p.expiry); return d >= 0 && d <= EXPIRING_THRESHOLD_DAYS; }
  function daysUntil(date) {
    const ms = new Date(date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    return Math.round(ms / 86400000);
  }
  function money(n) { return "$" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
  function stockStatus(quantity) {

    if (quantity === 0) {
        return `<span class="stock-badge out">Out of Stock</span>`;
    }

    if (quantity <= 10) {
        return `<span class="stock-badge low">Low Stock</span>`;
    }

    return `<span class="stock-badge good">In Stock</span>`;
}
  function showToast(message,type="success"){

    const container=document.getElementById("toastContainer");

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;

    toast.innerHTML=message;

    container.appendChild(toast);

    setTimeout(()=>{

        toast.style.animation="fadeOut .4s forwards";

        setTimeout(()=>{

            toast.remove();

        },400);

    },3000);

  }
  window.showToast = showToast;
  function hexToSoft(hex) {
    // returns a very light tint background for pills/icons, purely cosmetic
    return hex + "22";
  }

  /* ---------------------------------------------------------
     2. NOTIFICATION SYSTEM
     --------------------------------------------------------- */

  const NOTIF_ICONS = {
    add: { icon: "fa-circle-plus", cls: "icon-blue" },
    remove: { icon: "fa-circle-minus", cls: "icon-red" },
    inc: { icon: "fa-arrow-up", cls: "icon-yellow" },
    dec: { icon: "fa-arrow-down", cls: "icon-red" },
    expiring: { icon: "fa-hourglass-half", cls: "icon-yellow" },
    expired: { icon: "fa-skull-crossbones", cls: "icon-red" },
    value: { icon: "fa-sack-dollar", cls: "icon-green" },
    returned: { icon: "fa-rotate-left", cls: "icon-navy" },
    orderNew: { icon: "fa-cart-shopping", cls: "icon-blue" },
    orderUpdate: { icon: "fa-truck-fast", cls: "icon-blue" }
  };

  function pushNotification(type, title, desc) {
    state.notifications.unshift({
      id: Date.now() + Math.random(),
      type, title, desc,
      time: "Just now",
      unread: true
    });
    renderNotifications();
  }

  function renderNotifications() {
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");
    const unreadCount = state.notifications.filter(n => n.unread).length;

    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    badge.classList.toggle("zero", unreadCount === 0);

    if (state.notifications.length === 0) {
    list.innerHTML = `
        <div class="notif-empty">
            <i class="fa-solid fa-bell-slash"></i>
            <h4>No Notifications</h4>
            <p>You're all caught up!</p>
        </div>
    `;
    return;
}

    list.innerHTML = state.notifications.map(n => {
      const meta = NOTIF_ICONS[n.type] || NOTIF_ICONS.value;
      return `
        <div class="notif-item ${n.unread ? "unread" : ""}" data-id="${n.id}">
          <div class="notif-ic ${meta.cls}"><i class="fa-solid ${meta.icon}"></i></div>
          <div class="notif-text">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>`;
    }).join("");

    list.querySelectorAll(".notif-item").forEach(el => {
      el.addEventListener("click", () => {
        const n = state.notifications.find(x => x.id === Number(el.dataset.id) || x.id === parseFloat(el.dataset.id));
        if (n && n.unread) {
          n.unread = false;
          renderNotifications(); // unread count (and badge) decreases as items are read
        }
      });
    });
  }

  /* ---------------------------------------------------------
     3. TOAST
     --------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message, icon) {
    const toast = document.getElementById("toast");
    toast.innerHTML = `<i class="fa-solid ${icon || "fa-circle-check"}"></i><span>${message}</span>`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  /* ---------------------------------------------------------
     4. STAT CARD / DOT UPDATES
     --------------------------------------------------------- */

  function setTotalProductsDot(kind) {
    // kind: null | 'yellow' | 'red' | 'orange'
    const dot = document.getElementById("dotTotalProducts");
    dot.classList.remove("on-yellow", "on-red", "on-orange");
    if (kind) dot.classList.add("on-" + kind);
  }

  function refreshTotalProductsDot() {
    if (state.increasedFlag && state.decreasedFlag) setTotalProductsDot("orange");
    else if (state.increasedFlag) setTotalProductsDot("yellow");
    else if (state.decreasedFlag) setTotalProductsDot("red");
    else setTotalProductsDot(null);
  }

  async function updateStats() {

    const products = await getProducts();

    const total = products.length;
    const orders = await getOrders();

let orderedUnits = 0;

orders.forEach(order => {

    if (!order.items) return;

    order.items.forEach(item => {

        orderedUnits += Number(item.quantity) || 0;

    });

});

    let expiringCount = 0;
    let expiredCount = 0;
    let lowStock = 0;
    let value = 0;

    const today = new Date();

    products.forEach(product => {

        value += (product.price || 0) * (product.quantity || 0);
        if (product.quantity > 0 && product.quantity <= 10) {
    lowStock++;
}

        if (product.expiry) {

            const expiryDate = new Date(product.expiry);

            const diffDays = Math.ceil(
                (expiryDate - today) / (1000 * 60 * 60 * 24)
            );

            if (diffDays < 0) {

                expiredCount++;

            } else if (diffDays <= 7) {

                expiringCount++;

            }

        }

    });
    

    document.getElementById("statTotalProducts").textContent = total;
    document.getElementById("statExpiringSoon").textContent = expiringCount;
    document.getElementById("statExpiredProducts").textContent = expiredCount;
    document.getElementById("lowStockCount").textContent = lowStock;
    document.getElementById("statWarehouseValue").textContent = "₹" + value;
    document.getElementById("statOrderedCount").textContent = orderedUnits;
    

}

  /* ---------------------------------------------------------
     5. RENDER: CATEGORY BADGES (used across inventory/orders/reports)
     --------------------------------------------------------- */

  function categoryPill(cat) {
    const color = CATEGORY_COLORS[cat] || "#666";
    return `<span class="pill" style="background:${hexToSoft(color)};color:${color}">${cat}</span>`;
  }

  function reportPill(cat) {
    const color = REPORT_CATEGORY_COLORS[cat] || "#666";
    return `<span class="pill" style="background:${hexToSoft(color)};color:${color}">${cat}</span>`;
  }

  function stockHealthPill(p) {
    const d = daysUntil(p.expiry);
    if (d < 0) return `<span class="pill pill-red"><i class="fa-solid fa-skull-crossbones"></i> Expired</span>`;
    if (d <= EXPIRING_THRESHOLD_DAYS) return `<span class="pill pill-yellow"><i class="fa-solid fa-hourglass-half"></i> Near Expiry</span>`;
    return `<span class="pill pill-green"><i class="fa-solid fa-check"></i> Fresh</span>`;
  }

  function expiryPill(p) {
    const d = daysUntil(p.expiry);
    if (d < 0) return `<span class="pill pill-red"><i class="fa-solid fa-skull-crossbones"></i> Expired</span>`;
    if (d <= EXPIRING_THRESHOLD_DAYS) return `<span class="pill pill-yellow"><i class="fa-solid fa-hourglass-half"></i> ${d}d left</span>`;
    return `<span class="pill pill-green"><i class="fa-solid fa-check"></i> ${d}d left</span>`;
  }

  /* ---------------------------------------------------------
     6. RENDER: TOTAL PRODUCTS PAGE (category list + nav)
     --------------------------------------------------------- */

  async function renderCategoryList() {

    const container = document.getElementById("categoryList");

    if (!container) return;

    const products = await getProducts();

    const categories = Object.keys(CATEGORY_ICONS);

    container.innerHTML = "";

    categories.forEach(cat => {

        const count = products.filter(p => p.category === cat).length;

        const color = CATEGORY_COLORS[cat];

        container.innerHTML += `
            <button class="category-card" data-cat="${cat}">
                <div class="cat-icon"
                    style="background:${hexToSoft(color)};color:${color}">
                    <i class="fa-solid ${CATEGORY_ICONS[cat]}"></i>
                </div>

                <div class="cat-text">
                    <span class="cat-name"
                        style="color:${color}">
                        ${cat}
                    </span>

                    <span class="cat-count"
                        style="color:${color}">
                        ${count} items
                    </span>
                </div>

                <i class="fa-solid fa-chevron-right cat-arrow"></i>
            </button>
        `;
    });

    container.querySelectorAll(".category-card").forEach(btn => {
      btn.addEventListener("click", () => {

      console.log("Clicked:", btn.dataset.cat);

      showCategoryDetail(btn.dataset.cat);

});
    });

}
window.renderCategoryList = renderCategoryList;

  /* ---------------------------------------------------------
     7. RENDER: CATEGORY DETAIL PAGE
     --------------------------------------------------------- */

  async function showCategoryDetail(cat) {
    console.log("Category clicked:", cat);
    state.activeCategory = cat;
    const color = CATEGORY_COLORS[cat] || "#101826";

    const title = document.getElementById("categoryDetailTitle");
    title.textContent = cat;
    title.style.color = color;

    renderCategoryTop3(cat);
    await renderCategoryDetailTable(cat);
    showSection("categoryDetail");
  }

  function renderCategoryTop3(cat) {
    const strip = document.getElementById("categoryTop3");
    const items = state.products
      .filter(p => p.category === cat)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    if (items.length === 0) {
      strip.innerHTML = `<p style="color:var(--ink-400);font-size:13px;margin:0;">No products in this category yet.</p>`;
      return;
    }

    strip.innerHTML = items.map((p, i) => `
      <div class="top3-card">
        <div class="top3-rank">#${i + 1}</div>
        <div class="top3-info">
          <span class="top3-name">${p.name}</span>
          <span class="top3-qty">${p.quantity} units in stock</span>
        </div>
      </div>
    `).join("");
  }

  async function renderCategoryDetailTable(cat) {
    const body = document.getElementById("categoryDetailTableBody");
    const products = await getProducts();
    const rows = products.filter(p => p.category === cat);

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-400);padding:30px;">No products in this category.</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(p => `
      <tr>
        <td>${p.name}</td>
        <td class="qty-mono">${p.quantity}</td>
        <td class="price-mono">${money(p.price)}</td>
        <td class="date-mono">${fmtDate(p.expiry)}</td>
        <td>${stockHealthPill(p)}</td>
      </tr>
    `).join("");
  }

  /* ---------------------------------------------------------
     8. RENDER: INVENTORY / EXPIRING / EXPIRED
     --------------------------------------------------------- */

  async function renderInventoryTable() {

    const body = document.getElementById("inventoryTableBody");
    if (!body) return;

    const products = await getProducts();   // ✅ FIX: always get data

    const search = document.getElementById("inventorySearch")?.value.toLowerCase() || "";
    const category = document.getElementById("inventoryCategoryFilter")?.value || "all";

    const filteredProducts = products.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(search);
        const categoryMatch = category === "all" || p.category === category;
        return nameMatch && categoryMatch;
    });

    body.innerHTML = filteredProducts.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.quantity}</td>
            <td>${p.price}</td>
            <td>${p.expiry}</td>
            <td>${stockStatus(p.quantity)}</td>
            <td>

        <button class="edit-btn" data-id="${p.id}">

           ✏️ Edit

         </button>



        <button class="delete-btn" data-id="${p.id}">

          🗑 Delete

        </button>

     

      </td>
        </tr>
    `).join("");
}
  window.renderInventoryTable = renderInventoryTable;

  function renderExpiringTable() {
    const body = document.getElementById("expiringTableBody");
    const rows = state.products.filter(isExpiringSoon);
    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-400);padding:30px;">No products nearing expiry right now.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(p => `
      <tr data-id="${p.id}">
        <td>${p.name}</td>
        <td>${categoryPill(p.category)}</td>
        <td class="qty-mono">${p.quantity}</td>
        <td class="price-mono">${money(p.price)}</td>
        <td class="date-mono">${fmtDate(p.expiry)}</td>
        <td><button class="btn btn-primary act-update"><i class="fa-solid fa-arrow-up-right-from-square"></i> Update</button></td>
      </tr>
    `).join("");

   body.querySelectorAll(".act-update").forEach(btn => {

    btn.addEventListener("click", async (e) => {

        const row = e.target.closest("tr");
        const id = row.dataset.id;

        const p = state.products.find(x => x.id === id);

        if (!p) return;

        try {

            // Save priority to Firebase
            await updateProduct(id, {
                priority: true,
                priorityAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update local state
            p.priority = true;

            btn.disabled = true;

            btn.innerHTML =
                `<i class="fa-solid fa-check"></i> Prioritized`;

            showToast(
                `"${p.name}" is now prioritized on the User Dashboard.`,
                "fa-circle-check"
            );

            pushNotification(
                "value",
                "Product Prioritized",
                `${p.name} was prioritized for faster clearance.`
            );

        } catch (error) {

            console.error(
                "Error prioritizing product:",
                error
            );

            showToast(
                "Failed to prioritize product.",
                "fa-circle-xmark"
            );

        }

    });

});
  }

  function renderExpiredTable() {
    const body = document.getElementById("expiredTableBody");
    const rows = state.products.filter(isExpired);
    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-400);padding:30px;">No expired products. Warehouse is clean.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(p => `
      <tr data-id="${p.id}">
        <td>${p.name}</td>
        <td>${categoryPill(p.category)}</td>
        <td class="qty-mono">${p.quantity}</td>
        <td class="price-mono">${money(p.price)}</td>
        <td><button class="btn btn-danger act-remove"><i class="fa-solid fa-trash"></i> Remove</button></td>
      </tr>
    `).join("");

    body.querySelectorAll(".act-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const row = e.target.closest("tr");
        const id = row.dataset.id;
        removeExpiredProduct(id, row);
      });
    });
  }

  async function removeExpiredProduct(id, rowEl) {

    const p = state.products.find(x => x.id === id);

    if (!p) return;

    const lostValue = p.quantity * p.price;

    if (!confirm(`Remove "${p.name}" permanently?`)) return;

    rowEl.classList.add("row-exit");

    setTimeout(async () => {

        try {

            // Delete from Firestore
            await deleteProduct(String(id));

            // Remove from local state
            state.products = state.products.filter(x => x.id !== id);

            state.decreasedFlag = true;

            refreshTotalProductsDot();

            await updateStats();

            await renderExpiredTable();
            await renderInventoryTable();

            await renderCategoryList();

            renderDashboardPie();
            renderCategoryPieChart();

            if (state.activeCategory) {

                renderCategoryTop3(state.activeCategory);
                renderCategoryDetailTable(state.activeCategory);

            }

            pushNotification(
                "remove",
                "Expired Product Removed",
                `${p.name} was removed permanently.`
            );

            await addActivity(
                "Removed Expired Product",
                p.name
            );

            showToast("🗑️ Expired product removed successfully!");

        } catch (err) {

            console.error(err);

            showToast("❌ Failed to remove expired product!", "error");

        }

    }, 280);

}
  

  function renderLowStockTable() {

    const body = document.getElementById("lowStockTableBody");

    if (!body) return;

    const lowStockProducts = state.products.filter(product =>
        product.quantity > 0 && product.quantity <= 10
    );

    body.innerHTML = lowStockProducts.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${categoryPill(product.category)}</td>
            <td>${product.quantity}</td>
            <td>${money(product.price)}</td>
            <td>${stockStatus(product.quantity)}</td>
        </tr>
    `).join("");

}
  /* ---------------------------------------------------------
     9. RENDER: RETURNED / ORDERS / REPORTS
     --------------------------------------------------------- */

  function renderReturnedTable() {
    const body = document.getElementById("returnedTableBody");
    body.innerHTML = state.returned.map(r => `
      <tr>
        <td>${r.name}</td>
        <td class="qty-mono">${r.qty}</td>
        <td class="price-mono">${money(r.price)}</td>
        <td>${r.feedback}</td>
      </tr>
    `).join("");
  }

  const STATUS_PILL = {
    "Delivered": "pill-green",
    "Shipped": "pill-blue",
    "Processing": "pill-yellow",
    "Pending": "pill-gray"
  };

 async function renderOrdersTable() {

    const orders = await getOrders();

    const body = document.getElementById("ordersTableBody");

    body.innerHTML = orders.map(o => `
      <tr data-id="${o.id}">
        <td>${o.username}</td>
        <td>${o.product}</td>
        <td>${categoryPill(o.category)}</td>
        <td class="qty-mono">${o.quantity}</td>
        <td class="price-mono">${money(o.price)}</td>
        <td><span class="pill ${STATUS_PILL[o.status] || "pill-gray"}">${o.status}</span></td>

        <td>
        ${
            o.status === "Pending"
            ?
            `
            <button class="btn btn-success act-approve" data-id="${o.id}">
                <i class="fa-solid fa-check"></i> Approve
            </button>

            <button class="btn btn-danger act-reject" data-id="${o.id}">
                <i class="fa-solid fa-xmark"></i> Reject
            </button>
            `
            :
            `
            <button class="btn btn-ghost act-report" data-id="${o.id}">
                <i class="fa-solid fa-file-lines"></i> Report
            </button>
            `
        }
        </td>

      </tr>
    `).join("");



    // Report Button
    body.querySelectorAll(".act-report").forEach(btn => {

        btn.addEventListener("click", () => {

            const id = btn.dataset.id;

            const order = orders.find(o => o.id === id);

            showToast(`Report generated for ${order.product}.`);

        });

    });

}

  async function renderReportsTable() {

    const body = document.getElementById("reportsTableBody");

    if (!body) return;

    body.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;">
                Loading reviews...
            </td>
        </tr>
    `;

    try {

        // Get all real reviews from Firebase
        const snapshot = await db
            .collection("reviews")
            .get();

        const reviews = [];

        snapshot.forEach(doc => {

            reviews.push({
                id: doc.id,
                ...doc.data()
            });

        });

        // Newest reviews first
        reviews.sort((a, b) => {

            const dateA =
                a.createdAt && a.createdAt.toDate
                    ? a.createdAt.toDate().getTime()
                    : 0;

            const dateB =
                b.createdAt && b.createdAt.toDate
                    ? b.createdAt.toDate().getTime()
                    : 0;

            return dateB - dateA;

        });

        // No reviews
        if (reviews.length === 0) {

            body.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        No customer reviews yet.
                    </td>
                </tr>
            `;

            return;
        }

        // Display real Firebase reviews
        body.innerHTML = reviews.map(review => {

            const productName =
                escapeAdminReview(review.productName || "Unknown Product");

            const username =
                escapeAdminReview(review.username || "User");

            const reviewText =
                escapeAdminReview(review.review || "");

            const rating =
                Math.max(
                    0,
                    Math.min(5, Number(review.rating) || 0)
                );

            const stars =
                "★".repeat(rating) +
                "☆".repeat(5 - rating);

            let dateText = "-";

            if (review.createdAt && review.createdAt.toDate) {

                dateText =
                    review.createdAt
                        .toDate()
                        .toLocaleDateString("en-IN");

            }

            return `
                <tr>

                    <td>
                        <strong>${productName}</strong>
                    </td>

                    <td>
                        👤 ${username}
                    </td>

                    <td>
                        <span style="color:#f59e0b; font-size:18px;">
                            ${stars}
                        </span>
                        <br>
                        <small>${rating}/5</small>
                    </td>

                    <td style="max-width:450px; white-space:normal;">
                        ${reviewText}
                    </td>

                    <td>
                        ${dateText}
                    </td>

                </tr>
            `;

        }).join("");

    }

    catch (error) {

        console.error(
            "ERROR LOADING CUSTOMER REVIEWS:",
            error
        );

        body.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:red;">
                    Unable to load customer reviews.
                </td>
            </tr>
        `;

    }

}
function escapeAdminReview(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
/* =========================================================
   AI ANOMALY DETECTOR
   Custom FreshNest intelligence using existing data
   No external AI/API required
   ========================================================= */

/* =========================================================
   FRESHNEST AI RISK ANALYZER
   Custom AI-style warehouse intelligence
   Uses Firebase products + orders
   No external AI/API
   ========================================================= */

async function renderAIAnomalyDetector() {

    const summary =
        document.getElementById("aiAnomalySummary");

    const results =
        document.getElementById("aiAnomalyResults");

    if (!summary || !results) return;


    

    results.innerHTML = "";


    try {

        /* =====================================================
           GET REAL FIREBASE DATA
           ===================================================== */

        const products = await getProducts();
        const orders = await getOrders();


        /* =====================================================
           BUILD SALES DATA
           ===================================================== */

        const salesByProduct = {};


        orders.forEach(order => {

            if (!order.items) return;


            let orderDate = null;


            if (
                order.createdAt &&
                typeof order.createdAt.toDate === "function"
            ) {

                orderDate = order.createdAt.toDate();

            }
            else if (order.createdAt) {

                orderDate = new Date(order.createdAt);

            }


            if (
                !orderDate ||
                isNaN(orderDate.getTime())
            ) {

                return;

            }


            order.items.forEach(item => {

                const name =
                    String(item.name || "").trim();


                if (!name) return;


                const quantity =
                    Number(item.quantity) || 0;


                if (!salesByProduct[name]) {

                    salesByProduct[name] = [];

                }


                salesByProduct[name].push({

                    date: orderDate,
                    quantity: quantity

                });

            });

        });


        /* =====================================================
           ANALYSE EACH PRODUCT
           ===================================================== */

        const analysedProducts = [];


        products.forEach(product => {

            const name =
                String(product.name || "").trim();


            if (!name) return;


            const stock =
                Number(product.quantity) || 0;


            const sales =
                salesByProduct[name] || [];


            const today =
                new Date();


            /* -------------------------------------------------
               EXPIRY CALCULATION
               ------------------------------------------------- */

            let daysLeft = null;


            if (product.expiry) {

                const expiryDate =
                    new Date(product.expiry);


                if (!isNaN(expiryDate.getTime())) {

                    const start =
                        new Date(today);

                    start.setHours(0, 0, 0, 0);


                    daysLeft =
                        Math.ceil(
                            (
                                expiryDate - start
                            ) /
                            (1000 * 60 * 60 * 24)
                        );

                }

            }


            /* -------------------------------------------------
               RECENT SALES
               ------------------------------------------------- */

            let recentSales = 0;
            let previousSales = 0;


            sales.forEach(sale => {

                const daysAgo =
                    Math.floor(
                        (
                            today - sale.date
                        ) /
                        (1000 * 60 * 60 * 24)
                    );


                // Last 3 days
                if (
                    daysAgo >= 0 &&
                    daysAgo <= 2
                ) {

                    recentSales += sale.quantity;

                }


                // Previous 7 days
                else if (
                    daysAgo >= 3 &&
                    daysAgo <= 9
                ) {

                    previousSales += sale.quantity;

                }

            });


            const recentDailySales =
                recentSales / 3;


            const previousDailySales =
                previousSales / 7;


            /* =================================================
               AI RISK SCORE
               ================================================= */

            let riskScore = 0;


            /* -------------------------------------------------
               EXPIRY RISK
               ------------------------------------------------- */

            if (daysLeft !== null) {

                if (daysLeft <= 1) {

                    riskScore += 45;

                }
                else if (daysLeft <= 3) {

                    riskScore += 35;

                }
                else if (daysLeft <= 7) {

                    riskScore += 20;

                }
                else if (daysLeft <= 14) {

                    riskScore += 10;

                }

            }


            /* -------------------------------------------------
               STOCK RISK
               ------------------------------------------------- */

            if (stock >= 50) {

                riskScore += 25;

            }
            else if (stock >= 30) {

                riskScore += 20;

            }
            else if (stock >= 20) {

                riskScore += 15;

            }
            else if (stock >= 10) {

                riskScore += 8;

            }


            /* -------------------------------------------------
               SALES VELOCITY RISK
               ------------------------------------------------- */

            if (recentDailySales <= 0) {

                riskScore += 25;

            }
            else if (recentDailySales < 1) {

                riskScore += 20;

            }
            else if (recentDailySales < 2) {

                riskScore += 12;

            }
            else if (recentDailySales < 5) {

                riskScore += 5;

            }


            /* -------------------------------------------------
               DEMAND TREND
               ------------------------------------------------- */

            if (
                previousDailySales > 0 &&
                recentDailySales <
                previousDailySales * 0.5
            ) {

                riskScore += 10;

            }


            /* -------------------------------------------------
               LIMIT SCORE TO 100
               ------------------------------------------------- */

            riskScore =
                Math.min(100, riskScore);


            /* =================================================
               PREDICT REMAINING STOCK
               ================================================= */

            let predictedRemaining = stock;


            if (
                daysLeft !== null &&
                daysLeft > 0
            ) {

                predictedRemaining =
                    Math.max(
                        0,
                        Math.round(
                            stock -
                            (
                                recentDailySales *
                                daysLeft
                            )
                        )
                    );

            }


            /* =================================================
               ESTIMATE POSSIBLE WASTE
               ================================================= */

            let possibleWaste = 0;


            if (
                daysLeft !== null &&
                daysLeft >= 0
            ) {

                possibleWaste =
                    predictedRemaining;

            }


            /* =================================================
               RISK LEVEL
               ================================================= */

            let level;
            let icon;
            let title;


            if (riskScore >= 70) {

                level = "high";
                icon = "🔴";
                title = "High Risk";

            }
            else if (riskScore >= 40) {

                level = "medium";
                icon = "🟠";
                title = "Needs Attention";

            }
            else {

                level = "low";
                icon = "🟢";
                title = "Healthy";

            }


            /* =================================================
               AI RECOMMENDATION
               ================================================= */

            let recommendation;


            if (
                daysLeft !== null &&
                daysLeft <= 1 &&
                stock > 0
            ) {

                recommendation =
                    "Prioritise this product immediately or apply a strong discount.";

            }
            else if (
                daysLeft !== null &&
                daysLeft <= 3 &&
                possibleWaste > 0
            ) {

                recommendation =
                    "Increase visibility and consider applying a discount to reduce waste.";

            }
            else if (
                stock >= 30 &&
                recentDailySales < 2
            ) {

                recommendation =
                    "Sales are slow compared with stock. Consider a promotion or discount.";

            }
            else if (
                previousDailySales > 0 &&
                recentDailySales >
                previousDailySales * 2
            ) {

                recommendation =
                    "Demand is increasing. Monitor stock and consider restocking.";

            }
            else {

                recommendation =
                    "Current product activity appears healthy. Continue monitoring.";

            }


            analysedProducts.push({

                name: name,

                stock: stock,

                daysLeft: daysLeft,

                recentDailySales:
                    recentDailySales,

                previousDailySales:
                    previousDailySales,

                predictedRemaining:
                    predictedRemaining,

                possibleWaste:
                    possibleWaste,

                riskScore:
                    riskScore,

                level:
                    level,

                icon:
                    icon,

                title:
                    title,

                recommendation:
                    recommendation

            });

        });


        /* =====================================================
           SORT HIGHEST RISK FIRST
           ===================================================== */

        analysedProducts.sort(
            (a, b) =>
                b.riskScore -
                a.riskScore
        );


        /* =====================================================
           SUMMARY COUNTS
           ===================================================== */

        const highRisk =
            analysedProducts.filter(
                p => p.riskScore >= 70
            ).length;


        const mediumRisk =
            analysedProducts.filter(
                p =>
                    p.riskScore >= 40 &&
                    p.riskScore < 70
            ).length;


        const lowRisk =
            analysedProducts.filter(
                p => p.riskScore < 40
            ).length;


        const totalPossibleWaste =
            analysedProducts.reduce(
                (total, p) =>
                    total + p.possibleWaste,
                0
            );


        /* =====================================================
           SUMMARY CARDS
           ===================================================== */

        summary.innerHTML = `

    <div
        class="panel"
        data-ai-filter="all"
        style="padding:20px;cursor:pointer;"
    >
        <div style="font-size:28px;">
            🤖
        </div>

        <div style="font-size:28px;font-weight:700;">
            ${analysedProducts.length}
        </div>

        <div style="color:#777;">
            Products Analysed
        </div>
    </div>


    <div
        class="panel"
        data-ai-filter="high"
        style="padding:20px;cursor:pointer;"
    >
        <div style="font-size:28px;">
            🔴
        </div>

        <div style="font-size:28px;font-weight:700;">
            ${highRisk}
        </div>

        <div style="color:#777;">
            High Risk
        </div>
    </div>


    <div
        class="panel"
        data-ai-filter="medium"
        style="padding:20px;cursor:pointer;"
    >
        <div style="font-size:28px;">
            🟠
        </div>

        <div style="font-size:28px;font-weight:700;">
            ${mediumRisk}
        </div>

        <div style="color:#777;">
            Needs Attention
        </div>
    </div>


    <div
        class="panel"
        data-ai-filter="anomalies"
        style="padding:20px;cursor:pointer;"
    >
        <div style="font-size:28px;">
            📦
        </div>

        <div style="font-size:28px;font-weight:700;">
            ${totalPossibleWaste}
        </div>

        <div style="color:#777;">
            Possible At-Risk Units
        </div>
    </div>

`;


        /* =====================================================
           DISPLAY PRODUCTS
           ===================================================== */

        results.innerHTML =
            analysedProducts.map(product => {


                let borderColor;
                let background;


                if (product.riskScore >= 70) {

                    borderColor = "#dc2626";
                    background = "#fef2f2";

                }
                else if (product.riskScore >= 40) {

                    borderColor = "#f59e0b";
                    background = "#fffbeb";

                }
                else {

                    borderColor = "#16a34a";
                    background = "#f0fdf4";

                }


                let expiryText;


                if (product.daysLeft === null) {

                    expiryText =
                        "Expiry date unavailable";

                }
                else if (product.daysLeft < 0) {

                    expiryText =
                        "Already expired";

                }
                else if (product.daysLeft === 0) {

                    expiryText =
                        "Expires today";

                }
                else {

                    expiryText =
                        `${product.daysLeft} day(s) remaining`;

                }


                return `

                   <div
    class="panel ai-risk-card"
    data-risk="${product.level}"
    style="
        padding:22px;
        border-left:6px solid ${borderColor};
        background:${background};
    "
>
                        <!-- HEADER -->

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:flex-start;
                                gap:15px;
                                margin-bottom:18px;
                            "
                        >

                            <div>

                                <div
                                    style="
                                        font-size:15px;
                                        font-weight:600;
                                    "
                                >
                                    ${product.icon}
                                    ${product.title}
                                </div>

                                <h2
                                    style="
                                        margin:5px 0 0;
                                        font-size:21px;
                                    "
                                >
                                    ${escapeAIText(product.name)}
                                </h2>

                            </div>


                            <!-- SCORE -->

                            <div
                                style="
                                    min-width:75px;
                                    text-align:center;
                                    background:white;
                                    border-radius:12px;
                                    padding:10px;
                                    box-shadow:0 2px 8px rgba(0,0,0,.08);
                                "
                            >

                                <div
                                    style="
                                        font-size:24px;
                                        font-weight:800;
                                    "
                                >
                                    ${product.riskScore}
                                </div>

                                <div
                                    style="
                                        font-size:11px;
                                        color:#777;
                                    "
                                >
                                    / 100
                                </div>

                            </div>

                        </div>


                        <!-- RISK BAR -->

                        <div
                            style="
                                height:10px;
                                background:#e5e7eb;
                                border-radius:10px;
                                overflow:hidden;
                                margin-bottom:18px;
                            "
                        >

                            <div
                                style="
                                    width:${product.riskScore}%;
                                    height:100%;
                                    background:${borderColor};
                                "
                            ></div>

                        </div>


                        <!-- DATA -->

                        <div
                            style="
                                display:grid;
                                grid-template-columns:1fr 1fr;
                                gap:10px;
                                margin-bottom:15px;
                            "
                        >

                            <div
                                style="
                                    background:white;
                                    padding:12px;
                                    border-radius:9px;
                                "
                            >

                                <div
                                    style="
                                        font-size:12px;
                                        color:#777;
                                    "
                                >
                                    📦 Current Stock
                                </div>

                                <strong>
                                    ${product.stock} units
                                </strong>

                            </div>


                            <div
                                style="
                                    background:white;
                                    padding:12px;
                                    border-radius:9px;
                                "
                            >

                                <div
                                    style="
                                        font-size:12px;
                                        color:#777;
                                    "
                                >
                                    ⏳ Expiry
                                </div>

                                <strong>
                                    ${expiryText}
                                </strong>

                            </div>


                            <div
                                style="
                                    background:white;
                                    padding:12px;
                                    border-radius:9px;
                                "
                            >

                                <div
                                    style="
                                        font-size:12px;
                                        color:#777;
                                    "
                                >
                                    📉 Recent Sales
                                </div>

                                <strong>
                                    ${product.recentDailySales.toFixed(1)}
                                    units/day
                                </strong>

                            </div>


                            <div
                                style="
                                    background:white;
                                    padding:12px;
                                    border-radius:9px;
                                "
                            >

                                <div
                                    style="
                                        font-size:12px;
                                        color:#777;
                                    "
                                >
                                    🔮 Predicted Stock
                                </div>

                                <strong>
                                    ${product.predictedRemaining}
                                    units
                                </strong>

                            </div>

                        </div>


                        <!-- WASTE PREDICTION -->

                        <div
                            style="
                                background:white;
                                padding:14px;
                                border-radius:9px;
                                margin-bottom:12px;
                            "
                        >

                            <strong>
                                🔮 AI Waste Prediction
                            </strong>

                            <p
                                style="
                                    margin:7px 0 0;
                                "
                            >

                                Based on current sales speed,
                                approximately

                                <strong>
                                    ${product.possibleWaste} units
                                </strong>

                                may remain when this product
                                reaches its expiry.

                            </p>

                        </div>


                        <!-- RECOMMENDATION -->

                        <div
                            style="
                                background:white;
                                padding:14px;
                                border-radius:9px;
                            "
                        >

                            <strong>
                                💡 AI Recommendation
                            </strong>

                            <p
                                style="
                                    margin:7px 0 0;
                                "
                            >
                                ${product.recommendation}
                            </p>

                        </div>


                    </div>

                `;

            }).join("");


    }
    catch (error) {

        console.error(
            "FreshNest AI Error:",
            error
        );


        summary.innerHTML = "";


        results.innerHTML = `

            <div
                class="panel"
                style="
                    grid-column:1/-1;
                    padding:40px;
                    text-align:center;
                "
            >

                <div style="font-size:50px;">
                    ❌
                </div>

                <h2>
                    AI Analysis Failed
                </h2>

                <p style="color:#777;">
                    Please open the browser console
                    to see the error.
                </p>

            </div>

        `;

    }
    
    function escapeAIText(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

}
document.addEventListener("click", function(e) {

    const filterCard =
        e.target.closest("[data-ai-filter]");

    if (!filterCard) return;

    const type =
        filterCard.dataset.aiFilter;

    const cards =
        document.querySelectorAll(".ai-risk-card");

    cards.forEach(card => {

        const risk =
            card.dataset.risk;

        if (type === "all") {

            card.style.display = "";

        }

        else if (type === "anomalies") {

            card.style.display =
                (risk === "high" || risk === "medium")
                    ? ""
                    : "none";

        }

        else {

            card.style.display =
                risk === type
                    ? ""
                    : "none";

        }

    });

});

  async function renderActivityTable() {

    const tbody = document.getElementById("activityTableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const activities = await getActivities();

    activities.forEach(activity => {

        let date = "";

        if (activity.timestamp) {
            date = activity.timestamp.toDate().toLocaleString();
        } else {
            date = "Just now";
        }

        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${activity.action}</td>
                <td>${activity.details}</td>
            </tr>
        `;

    });

}

  /* ---------------------------------------------------------
     10. PIE CHARTS (hand-rolled canvas — no chart library)
     --------------------------------------------------------- */

  // Dashboard: Top 5 individual products currently in stock
  function renderDashboardPie() {
    const canvas = document.getElementById("stockPie");
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const top5 = [...state.products].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const total = top5.reduce((s, p) => s + p.quantity, 0) || 1;

    const cx = w / 2, cy = h / 2, radius = Math.min(w, h) / 2 - 10;
    let startAngle = -Math.PI / 2;

    top5.forEach(p => {
      const sliceAngle = (p.quantity / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = CATEGORY_COLORS[p.category] || "#999";
      ctx.fill();
      startAngle += sliceAngle;
    });

    // donut hole for a cleaner, modern look
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.fillStyle = "#101826";
    ctx.font = "600 15px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(total), cx, cy - 2);
    ctx.font = "500 10px 'Inter', sans-serif";
    ctx.fillStyle = "#8993a4";
    ctx.fillText("units (top 5)", cx, cy + 14);

    const legend = document.getElementById("chartLegend");
    legend.innerHTML = top5.map(p => `
      <li>
        <span class="legend-swatch" style="background:${CATEGORY_COLORS[p.category] || "#999"}"></span>
        ${p.name} <span class="legend-val">${p.quantity}</span>
      </li>
    `).join("");
  }

  // Total Products page: full category distribution, clickable slices/legend
  let categorySliceRanges = [];

  async function renderCategoryPieChart() {
    const canvas = document.getElementById("categoryPie");
    const ctx = canvas.getContext("2d");
    const w = 240;
    const h = 240;

    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const categories = Object.keys(CATEGORY_ICONS);
    const byCategory = {};
    categories.forEach(cat => { byCategory[cat] = 0; });
    const products = await getProducts();

    products.forEach(p => {
      if (byCategory[p.category] !== undefined) {
        byCategory[p.category] += Number(p.quantity || 0);
      }
    });

    const entries = categories.map(cat => [cat, byCategory[cat]]);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    if (total === 0) {

      ctx.fillStyle = "#8993a4";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No products", w / 2, h / 2);

      return;
    }
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.max(Math.min(w, h) / 2 - 10, 0);
    let startAngle = -Math.PI / 2;
    categorySliceRanges = [];
    const activeEntries = entries.filter(([cat, val]) => val > 0);
    activeEntries.forEach(([cat, val]) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = CATEGORY_COLORS[cat] || "#999";
      ctx.fill();
      categorySliceRanges.push({ cat, start: startAngle, end: startAngle + sliceAngle });
      startAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.fillStyle = "#101826";
    ctx.font = "600 15px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(total), cx, cy - 2);
    ctx.font = "500 10px 'Inter', sans-serif";
    ctx.fillStyle = "#8993a4";
    ctx.fillText("units in stock", cx, cy + 14);

    const legend = document.getElementById("categoryLegend");
    legend.innerHTML = entries.map(([cat, val]) => `
      <li data-cat="${cat}">
        <span class="legend-swatch" style="background:${CATEGORY_COLORS[cat] || "#999"}"></span>
        ${cat} <span class="legend-val">${val}</span>
      </li>
    `).join("");
    legend.querySelectorAll("li").forEach(li => {
      li.addEventListener("click", () => showCategoryDetail(li.dataset.cat));
    });

    // wire (or re-wire) canvas click-to-drill-down; assigning onclick avoids stacking duplicate listeners
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX - cx;
      const y = (e.clientY - rect.top) * scaleY - cy;
      const dist = Math.sqrt(x * x + y * y);
      if (dist > radius || dist < radius * 0.55) return; // outside ring
      let angle = Math.atan2(y, x);
      if (angle < -Math.PI / 2) angle += Math.PI * 2; // normalize to match our -90deg start
      const hit = categorySliceRanges.find(r => angle >= r.start && angle <= r.end);
      if (hit) showCategoryDetail(hit.cat);
    };
  }

  /* ---------------------------------------------------------
     11. SECTION / NAVIGATION
     --------------------------------------------------------- */

  function showSection(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById("view-" + name);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.section === name);
    });

    closeSidebar();
    document.getElementById("content").scrollTo({ top: 0, behavior: "smooth" });
  }

  function wireNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => showSection(item.dataset.section));
    });

    document.querySelectorAll("[data-goto]").forEach(el => {
      el.addEventListener("click", () => showSection(el.dataset.goto));
    });

    document.querySelectorAll("[data-back]").forEach(el => {
      el.addEventListener("click", () => showSection(el.dataset.back));
    });
  }

  /* ---------------------------------------------------------
     12. SIDEBAR (slide-in drawer, collapsed by default)
     --------------------------------------------------------- */

  function openSidebar() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarBackdrop").classList.add("show");
  }

  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarBackdrop").classList.remove("show");
  }

  function wireSidebar() {
    document.getElementById("sidebarToggle").addEventListener("click", openSidebar);
    document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
    document.getElementById("sidebarBackdrop").addEventListener("click", closeSidebar);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSidebar();
    });
  }

  /* ---------------------------------------------------------
     13. NOTIFICATION PANEL TOGGLE
     --------------------------------------------------------- */

  function wireNotificationPanel() {
    const bell = document.getElementById("notifBell");
    const panel = document.getElementById("notifPanel");

    bell.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && e.target !== bell) {
        panel.classList.remove("open");
      }
    });

    document.getElementById("clearNotifs").addEventListener("click",(e)=>{

    e.stopPropagation();

    state.notifications = [];

    renderNotifications();

});

    document.getElementById("closeNotifPanel").addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.remove("open");
    });
  }

  /* ---------------------------------------------------------
     14. LIVE DATE / TIME / API STATUS (header + sidebar)
     --------------------------------------------------------- */

  function startLiveClock() {
    function tick() {
      const now = new Date();
      document.getElementById("liveDateText").textContent =
        now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      document.getElementById("liveTimeText").textContent =
        now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    tick();
    setInterval(tick, 1000);
  }

  function simulateApiStatus() {
    // TODO-BACKEND: replace with a real health-check request (e.g. fetch('/api/health'))
    const apiDot = document.getElementById("apiDot");
    const apiLabel = document.getElementById("apiLabel");
    const onlineDot = document.getElementById("onlineDot");
    const onlineLabel = document.getElementById("onlineLabel");

    function setStatus(connected) {
      apiDot.classList.toggle("offline", !connected);
      apiLabel.textContent = connected ? "Connected" : "Not Connected";
      onlineDot.classList.toggle("offline", !connected);
      onlineLabel.textContent = connected ? "Online" : "Offline";
    }

    setStatus(true);
    // occasionally flicker to simulate a live connection check
    setInterval(() => {
      const connected = Math.random() > 0.08;
      setStatus(connected);
    }, 15000);
  }

  /* ---------------------------------------------------------
     15. LIVE WAREHOUSE EVENT SIMULATION
     (mimics backend push events using setInterval — purely
     illustrative so the dashboard doesn't feel static)
     --------------------------------------------------------- */

  function simulateLiveEvents() {
    setInterval(() => {

        // Don't generate fake notifications

        refreshTotalProductsDot();
        updateStats();
        renderInventoryTable();
        renderDashboardPie();
        renderCategoryPieChart();
        renderCategoryList();

        if (state.activeCategory) {
            renderCategoryTop3(state.activeCategory);
            renderCategoryDetailTable(state.activeCategory);
        }

    }, 20000);
}

  /* ---------------------------------------------------------
     16. INIT
     --------------------------------------------------------- */
  function generateNotifications() {

    // Clear old notifications
    state.notifications = [];

    const today = new Date();

    state.products.forEach(product => {

        // -------- Expiry --------
        if (product.expiry) {

            const expiryDate = new Date(product.expiry);

            const diffDays = Math.ceil(
                (expiryDate - today) / (1000 * 60 * 60 * 24)
            );

            if (diffDays < 0) {

                pushNotification(
                    "expired",
                    "Expired Product",
                    `${product.name} expired ${Math.abs(diffDays)} day(s) ago`
                );

            }
            else if (diffDays === 0) {

                pushNotification(
                    "warning",
                    "Expires Today",
                    `${product.name} expires today`
                );

            }
            else if (diffDays <= 7) {

                pushNotification(
                    "expiring",
                    "Expiring Soon",
                    `${product.name} expires in ${diffDays} day(s)`
                );

            }
        }

        // -------- Low Stock --------
        if (product.quantity > 0 && product.quantity <= 10) {

            pushNotification(
                "lowstock",
                "Low Stock",
                `${product.name} has only ${product.quantity} left`
            );

        }

        // -------- Out of Stock --------
        if (product.quantity === 0) {

            pushNotification(
                "outstock",
                "Out of Stock",
                `${product.name} is out of stock`
            );

        }

    });

}
  async function init() {
    state.products = await getProducts();
    state.orders = await getOrders();
    // Generate notifications based on products
    generateNotifications();

    wireNavigation();
    wireSidebar();
    wireNotificationPanel();
   
    await renderCategoryList();
    await renderInventoryTable();
    renderExpiringTable();
    renderExpiredTable();
    renderReturnedTable();
    renderOrdersTable();
   await renderReportsTable();
await renderAIAnomalyDetector();
renderDashboardPie();
    await renderCategoryPieChart();
    await updateStats();
    renderNotifications();
    renderLowStockTable();
    await renderActivityTable();
    
    


    startLiveClock();
    simulateApiStatus();

    // seed a couple of welcome notifications
    
    if (state.returned.length > 0) {
    state.returned[0].isNew = true;
}
    updateStats();

  }
  document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("delete-btn")) return;

    const id = e.target.dataset.id;

    if (!confirm("Delete this product?")) return;

    try {

    await deleteProduct(id);

    console.log("Delete successful");

    showToast("🗑️ Product Deleted Successfully!");

    await renderInventoryTable();
    await updateStats();

    if (typeof renderCategoryList === "function") {
        await renderCategoryList();
    }

    if (typeof renderCategoryPieChart === "function") {
        renderCategoryPieChart();
    }

} catch (err) {

    console.error("DELETE ERROR:", err);

    showToast("❌ Delete failed!", "error");

}
    });
    document.addEventListener("click", async (e)=>{

     if(!e.target.classList.contains("edit-btn")) return;


     const id = e.target.dataset.id;


     const products = await getProducts();


     const product = products.find(p => p.id === id);


     if(!product) return;


     editingProductId = id;
     document.getElementById("saveProduct").textContent = "Update Product";
     console.log("Edit ID saved:", editingProductId);


     document.getElementById("productName").value = product.name;
     document.getElementById("category").value = product.category;
     document.getElementById("price").value = product.price;
     document.getElementById("quantity").value = product.quantity;
     document.getElementById("mfgDate").value = product.mfgDate;
     document.getElementById("expiry").value = product.expiry;


     document.getElementById("saveProduct").textContent = "Update Product";


     showSection("add-product");

    });
   

    document.addEventListener("DOMContentLoaded", () => {

    const search = document.getElementById("inventorySearch");
    const filter = document.getElementById("inventoryCategoryFilter");


    if(search){
        search.addEventListener("input", renderInventoryTable);
    }


    if(filter){
        filter.addEventListener("change", renderInventoryTable);
    }

});


  console.log(firebase);
  document.addEventListener("DOMContentLoaded", init);
})();
