// ui.js — rendering + keyboard engine + search overlay. Classic script → window.UI
(function () {
  const $ = (s) => document.querySelector(s);
  const money = (n) => n.toFixed(2);

  let overlayOpen = false;
  let qtyEditing = false;
  let helpOpen = false;
  let voidArmedAt = 0;
  let flashTimers = {};

  // ── Grid (rendered once) ───────────────────────────────
  function renderGrid() {
    const grid = $("#grid");
    grid.textContent = "";
    for (const p of window.PRODUCTS) {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.code = p.code;

      const meta = document.createElement("div");
      meta.className = "card-meta";
      const code = document.createElement("span");
      code.textContent = "#" + p.code;
      const gst = document.createElement("span");
      gst.textContent = p.gst + "%";
      meta.append(code, gst);

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = p.name;

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = "₹" + (Number.isInteger(p.price) ? p.price : p.price.toFixed(2));

      card.append(meta, name, price);
      card.addEventListener("click", () => addProduct(p));
      grid.append(card);
    }
  }

  function flashCard(code) {
    const card = document.querySelector(`.card[data-code="${code}"]`);
    if (!card) return;
    card.classList.remove("flash");
    void card.offsetWidth; // restart animation
    card.classList.add("flash");
    clearTimeout(flashTimers[code]);
    flashTimers[code] = setTimeout(() => card.classList.remove("flash"), 900);
  }

  function addProduct(p) {
    window.Bills.addProduct(p, 1);
    flashCard(p.code);
  }

  // ── Search overlay ─────────────────────────────────────
  const search = {
    query: "",
    results: [],
    sel: 0,
  };

  function openSearch(seed) {
    overlayOpen = true;
    $("#search").classList.remove("hidden");
    const input = $("#search-input");
    input.value = seed || "";
    search.query = seed || "";
    runSearch();
    input.focus();
  }

  function closeSearch() {
    overlayOpen = false;
    $("#search").classList.add("hidden");
    $("#search-input").blur();
  }

  // initials ("am" → "Amul Butter") + word-prefix + code match
  function matchProduct(p, q) {
    const ql = q.toLowerCase();
    if (p.code.startsWith(ql)) return 3;
    const words = p.name.toLowerCase().split(/\s+/);
    if (p.name.toLowerCase().startsWith(ql)) return 2;
    if (words.some((w) => w.startsWith(ql))) return 1;
    const initials = words.map((w) => w[0]).join("");
    if (initials.startsWith(ql)) return 1;
    return 0;
  }

  function runSearch() {
    const q = search.query.trim().toLowerCase();
    const box = $("#search-results");
    box.textContent = "";
    search.results = [];
    search.sel = 0;

    const count = $("#search-count");
    if (!q) {
      const hint = document.createElement("div");
      hint.className = "search-hint";
      hint.textContent = "Type initials — “am” finds Amul Butter";
      box.append(hint);
      count.textContent = window.PRODUCTS.length + " products";
      return;
    }

    search.results = window.PRODUCTS.map((p) => ({ p, score: matchProduct(p, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.p.code.localeCompare(b.p.code))
      .map((r) => r.p);

    if (!search.results.length) {
      const none = document.createElement("div");
      none.className = "search-none";
      none.textContent = `No match for “${search.query.trim()}”`;
      box.append(none);
      count.textContent = "0 products";
      return;
    }

    count.textContent = search.results.length + (search.results.length === 1 ? " product" : " products");

    search.results.forEach((p, i) => {
      const r = document.createElement("div");
      r.className = "search-item" + (i === search.sel ? " sel" : "");
      const nm = document.createElement("span");
      nm.className = "si-name";
      nm.textContent = p.name;
      const meta = document.createElement("span");
      meta.className = "si-meta";
      meta.textContent = `#${p.code} · ₹${money(p.price)}`;
      r.append(nm, meta);
      r.addEventListener("click", () => pickSearch(i));
      box.append(r);
    });
  }

  function moveSearch(delta) {
    if (!search.results.length) return;
    search.sel = (search.sel + delta + search.results.length) % search.results.length;
    runSearchReselect();
  }

  function runSearchReselect() {
    const items = $("#search-results").children;
    for (let i = 0; i < items.length; i++) items[i].classList.toggle("sel", i === search.sel);
    items[search.sel]?.scrollIntoView({ block: "nearest" });
  }

  function pickSearch(i) {
    const p = search.results[i ?? search.sel];
    if (!p) return;
    addProduct(p);
    closeSearch();
    status(`${p.name} added`, true);
  }

  // ── Main render ────────────────────────────────────────
  function renderAll() {
    renderTabs();
    renderBillPanel();
  }

  function renderTabs() {
    const st = window.Bills.get();
    const wrap = $("#tabs");
    wrap.textContent = "";
    st.bills.forEach((b, i) => {
      const t = window.Bills.totals(b);
      const tab = document.createElement("button");
      tab.className = "tab" + (i === st.active ? " active" : "");
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = i + 1;
      const label = document.createElement("span");
      label.textContent = "Customer " + (i + 1);
      const amt = document.createElement("span");
      amt.className = "amt";
      amt.textContent = "₹" + (t.grand % 1 === 0 ? t.grand : t.grand.toFixed(2));
      tab.append(n, label, amt);
      const x = document.createElement("span");
      x.className = "tab-x";
      x.textContent = "×";
      x.title = "Close customer";
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        window.Bills.closeBill(i);
      });
      tab.append(x);
      tab.addEventListener("click", () => window.Bills.setActive(i));
      wrap.append(tab);
    });
    const plus = document.createElement("button");
    plus.className = "tab plus";
    const plusN = document.createElement("span");
    plusN.className = "n";
    plusN.textContent = "+";
    plus.append(plusN, document.createTextNode("New"));
    plus.addEventListener("click", () => window.Bills.newBill());
    wrap.append(plus);
  }

  function renderBillPanel() {
    const st = window.Bills.get();
    const b = window.Bills.activeBill();
    const t = window.Bills.totals(b);

    $("#bill-no").textContent = "Bill #" + String(b.no).padStart(4, "0");
    $("#paychip").textContent = b.payment;

    const lines = $("#lines");
    lines.textContent = "";
    if (!b.lines.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.append(document.createTextNode("No items yet — "));
      const kbd = document.createElement("kbd");
      kbd.textContent = "F1";
      empty.append(kbd, document.createTextNode(" to search"));
      lines.append(empty);
    }
    b.lines.forEach((l, i) => {
      const line = document.createElement("div");
      line.className = "line" + (i === st.selLine ? " sel" : "");

      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = l.name;

      const qty = document.createElement("div");
      qty.className = "qty";
      qty.textContent = `${l.qty} × ₹${money(l.price)}`;

      const amt = document.createElement("div");
      amt.className = "amt";
      amt.textContent = "₹" + money(l.price * l.qty);

      const unit = document.createElement("div");
      unit.className = "unit";
      unit.textContent = `GST ${l.gst}%`;

      line.append(nm, amt, qty, unit);
      if (qtyEditing && i === st.selLine) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "1";
        input.max = "999";
        input.value = l.qty;
        input.className = "qty-input";
        qty.replaceWith(input);
        input.focus();
        input.select();
        input.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            qtyEditing = false;
            window.Bills.setQtyAt(i, parseFloat(input.value));
          } else if (e.key === "Escape") {
            qtyEditing = false;
            renderAll();
          }
        });
        input.addEventListener("blur", () => {
          if (qtyEditing) {
            qtyEditing = false;
            window.Bills.setQtyAt(i, parseFloat(input.value));
          }
        });
      }
      line.addEventListener("click", () => {
        const st2 = window.Bills.get();
        // select without full re-render loop: fine to call
        window.Bills.selectLine(i);
      });
      lines.append(line);
    });

    $("#t-sub").textContent = "₹" + money(t.subtotal);
    $("#t-gst").textContent = "₹" + money(t.gst);
    $("#t-grand").textContent = "₹" + money(t.grand);
    $("#paybtn-amount").textContent = "₹" + money(t.grand);
  }

  function status(msg, isOk) {
    const el = $("#status");
    el.textContent = msg;
    el.classList.toggle("ok", !!isOk);
  }

  // ── Help overlay ───────────────────────────────────────
  function toggleHelp(force) {
    helpOpen = force !== undefined ? force : !helpOpen;
    $("#help").classList.toggle("hidden", !helpOpen);
  }

  // ── Keyboard engine ────────────────────────────────────
  const FKEYS = new Set(["F1","F2","F3","F4","F6","F8","F9","F10"]);

  document.addEventListener("keydown", (e) => {
    if (helpOpen) {
      if (e.key === "Escape" || e.key === "F10" || e.key === "?") { e.preventDefault(); toggleHelp(false); }
      return;
    }

    // qty inline editing captures its own keys (stopPropagation above)
    if (e.target.tagName === "INPUT" && e.target.type === "number") return;

    if (overlayOpen) {
      if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveSearch(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveSearch(-1); }
      else if (e.key === "Enter") { e.preventDefault(); pickSearch(); }
      return; // printable keys go to the input naturally
    }

    if (FKEYS.has(e.key)) e.preventDefault();

    switch (e.key) {
      case "F1":
      case "/":
        e.preventDefault();
        openSearch("");
        break;
      case "F2":
        payAndPrint();
        break;
      case "F3":
        if (window.Bills.activeBill().lines.length) { qtyEditing = true; renderBillPanel(); }
        break;
      case "F4":
      case "Delete":
        window.Bills.removeSelected();
        break;
      case "F6":
        window.Bills.cyclePay();
        break;
      case "F8": {
        const now = Date.now();
        if (now - voidArmedAt < 2000) {
          voidArmedAt = 0;
          const no = window.Bills.voidBill();
          status(`Bill #${no} voided`);
        } else {
          voidArmedAt = now;
          status("Press F8 again to void this bill");
        }
        break;
      }
      case "F9":
        window.Bills.newBill();
        break;
      case "F10":
      case "?":
        e.preventDefault();
        toggleHelp();
        break;
      case "ArrowLeft":
        e.preventDefault();
        window.Bills.switchBill(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        window.Bills.switchBill(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        window.Bills.moveLineSel(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        window.Bills.moveLineSel(1);
        break;
      case "+":
      case "=":
        window.Bills.bumpSelected(1);
        break;
      case "-":
        window.Bills.bumpSelected(-1);
        break;
      case "l":
      case "L": {
        e.preventDefault();
        const html = document.documentElement;
        html.classList.toggle("mode-light");
        html.classList.toggle("mode-dark");
        break;
      }
      default:
        // any letter or digit opens search seeded with that char
        if (/^[a-z0-9]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          openSearch(e.key);
        }
    }
  });

  // Letters/digits open search seeded with that char — no plain-letter
  // commands exist, so there is no clash with the F-key operations.

  function payAndPrint() {
    const ok = window.Print.pay(window.Bills.activeBill(), window.Bills.totals, () => {
      window.Bills.completeActive();
      status("Paid & printed", true);
    });
    if (!ok) {
      status("Bill is empty — add items first");
      $("#paybtn").classList.add("shake");
      setTimeout(() => $("#paybtn").classList.remove("shake"), 400);
    }
  }

  // ── Clock ──────────────────────────────────────────────
  function tick() {
    const d = new Date();
    $("#clock").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // ── Init ───────────────────────────────────────────────
  window.addEventListener("DOMContentLoaded", () => {
    renderGrid();
    window.Bills.init(renderAll);
    renderAll();
    tick();
    setInterval(tick, 10000);
    $("#search-input").addEventListener("input", (e) => {
      search.query = e.target.value;
      runSearch();
    });
    $("#paybtn").addEventListener("click", payAndPrint);
    $("#paychip").addEventListener("click", () => window.Bills.cyclePay());
  });

  window.UI = { openSearch, closeSearch, toggleHelp };
})();
