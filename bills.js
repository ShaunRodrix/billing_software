// bills.js — state + pure money logic + localStorage. Classic script → window.Bills
// Pure functions take args, return values, no DOM — tested by tests/bills.test.mjs
(function () {
  const LS_OPEN = "pos.open";
  const LS_DONE = "pos.completed";
  const LS_NO   = "pos.nextNo";
  const PAY_METHODS = ["CASH", "CARD", "UPI"];

  // ── Pure ────────────────────────────────────────────────
  const r2 = (n) => Math.round(n * 100) / 100;

  function lineAmount(line) {
    return r2(line.price * line.qty);
  }

  function lineGst(line) {
    return r2(lineAmount(line) * line.gst / 100);
  }

  // { subtotal, gst, grand } for a bill
  function totals(bill) {
    let subtotal = 0, gst = 0;
    for (const l of bill.lines) {
      subtotal += lineAmount(l);
      gst += lineGst(l);
    }
    subtotal = r2(subtotal);
    gst = r2(gst);
    return { subtotal, gst, grand: r2(subtotal + gst) };
  }

  // Add qty of a product to a bill's lines (merges by code). Returns new lines array.
  function addLine(lines, product, qty = 1) {
    const next = lines.map((l) => ({ ...l }));
    const found = next.find((l) => l.code === product.code);
    if (found) {
      found.qty = Math.min(999, found.qty + qty);
    } else {
      next.push({ code: product.code, name: product.name, price: product.price, gst: product.gst, qty: Math.min(999, qty) });
    }
    return next.filter((l) => l.qty > 0);
  }

  function removeLine(lines, index) {
    return lines.filter((_, i) => i !== index);
  }

  function setQty(lines, index, qty) {
    if (!Number.isFinite(qty) || qty <= 0) return lines;
    return lines.map((l, i) => (i === index ? { ...l, qty: Math.min(999, Math.floor(qty)) } : l));
  }

  function nextPayMethod(current) {
    const i = PAY_METHODS.indexOf(current);
    return PAY_METHODS[(i + 1) % PAY_METHODS.length];
  }

  // ── Storage ─────────────────────────────────────────────
  function load() {
    try { return JSON.parse(localStorage.getItem(LS_OPEN)) || []; } catch { return []; }
  }
  function saveOpen(bills) {
    try { localStorage.setItem(LS_OPEN, JSON.stringify(bills)); } catch {}
  }
  function loadCompleted() {
    try { return JSON.parse(localStorage.getItem(LS_DONE)) || []; } catch { return []; }
  }
  function saveCompleted(list) {
    try { localStorage.setItem(LS_DONE, JSON.stringify(list)); } catch {}
  }
  function loadNextNo() {
    const n = parseInt(localStorage.getItem(LS_NO), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  function saveNextNo(n) {
    try { localStorage.setItem(LS_NO, String(n)); } catch {}
  }

  // ── Store (observable-ish: onChange callback re-renders) ─
  const state = {
    bills: [],          // { id, no, lines, payment, openedAt }
    active: 0,
    selLine: 0,         // selected line index in active bill
    nextNo: 1,
    completed: [],
  };
  let onChange = () => {};

  function newBill() {
    return { id: Date.now() + Math.random(), no: state.nextNo, lines: [], payment: PAY_METHODS[0], openedAt: Date.now() };
  }

  function persist() {
    saveOpen(state.bills);
    saveCompleted(state.completed);
    saveNextNo(state.nextNo);
  }

  const api = {
    PAY_METHODS,
    // pure fns exposed for tests
    lineAmount, lineGst, totals, addLine, removeLine, setQty, nextPayMethod, r2,

    init(changeCb) {
      onChange = changeCb;
      state.completed = loadCompleted();
      state.nextNo = loadNextNo();
      state.bills = load();
      state.bills.forEach((b) => (b.lines = b.lines || []));
      if (state.bills.length === 0) state.bills = [newBill()];
      state.active = Math.min(state.active, state.bills.length - 1);
    },

    get() { return state; },
    activeBill() { return state.bills[state.active]; },

    addProduct(product, qty = 1) {
      const b = api.activeBill();
      b.lines = addLine(b.lines, product, qty);
      state.selLine = b.lines.length - 1;
      persist();
      onChange();
    },

    removeSelected() {
      const b = api.activeBill();
      if (!b.lines.length) return;
      b.lines = removeLine(b.lines, state.selLine);
      state.selLine = Math.max(0, Math.min(state.selLine, b.lines.length - 1));
      persist();
      onChange();
    },

    bumpSelected(delta) {
      const b = api.activeBill();
      const l = b.lines[state.selLine];
      if (!l) return;
      b.lines = setQty(b.lines, state.selLine, l.qty + delta);
      b.lines = b.lines.filter((x) => x.qty > 0);
      state.selLine = Math.max(0, Math.min(state.selLine, b.lines.length - 1));
      persist();
      onChange();
    },

    setQtyAt(index, qty) {
      const b = api.activeBill();
      b.lines = setQty(b.lines, index, qty).filter((x) => x.qty > 0);
      state.selLine = Math.max(0, Math.min(state.selLine, b.lines.length - 1));
      persist();
      onChange();
    },

    moveLineSel(delta) {
      const n = api.activeBill().lines.length;
      if (!n) return;
      state.selLine = (state.selLine + delta + n) % n;
      onChange();
    },

    selectLine(i) {
      const n = api.activeBill().lines.length;
      if (i < 0 || i >= n) return;
      state.selLine = i;
      onChange();
    },

    cyclePay() {
      const b = api.activeBill();
      b.payment = nextPayMethod(b.payment);
      persist();
      onChange();
    },

    switchBill(delta) {
      const n = state.bills.length;
      state.active = (state.active + delta + n) % n;
      state.selLine = 0;
      onChange();
    },

    setActive(i) {
      if (i < 0 || i >= state.bills.length) return;
      state.active = i;
      state.selLine = 0;
      onChange();
    },

    newBill() {
      state.bills.push(newBill());
      state.active = state.bills.length - 1;
      state.selLine = 0;
      persist();
      onChange();
    },

    // Void active bill: clears it in place, keeps slot; bumps nothing. Returns voided bill no.
    voidBill() {
      const b = api.activeBill();
      const no = b.no;
      state.bills.splice(state.active, 1);
      if (state.bills.length === 0) state.bills = [newBill()];
      state.active = Math.min(state.active, state.bills.length - 1);
      state.selLine = 0;
      persist();
      onChange();
      return no;
    },

    // Close customer tab i: discard its bill. Keeps ≥1 bill open.
    // Adjusts active if the closed tab was at/before it. Returns closed bill no, or null if i invalid.
    closeBill(i) {
      if (i < 0 || i >= state.bills.length) return null;
      const no = state.bills[i].no;
      state.bills.splice(i, 1);
      if (state.bills.length === 0) state.bills = [newBill()];
      if (state.active > i) state.active -= 1;
      state.active = Math.min(state.active, state.bills.length - 1);
      state.selLine = 0;
      persist();
      onChange();
      return no;
    },

    // Called after print dialog closes. Completes active bill, clears slot.
    completeActive() {
      const b = api.activeBill();
      const t = totals(b);
      state.completed.push({ no: b.no, at: Date.now(), payment: b.payment, subtotal: t.subtotal, gst: t.gst, grand: t.grand, items: b.lines.reduce((s, l) => s + l.qty, 0) });
      state.nextNo = Math.max(state.nextNo, b.no + 1);
      state.bills.splice(state.active, 1);
      if (state.bills.length === 0) state.bills = [newBill()];
      state.active = Math.min(state.active, state.bills.length - 1);
      state.selLine = 0;
      persist();
      onChange();
    },

    completedToday() {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      return state.completed.filter((c) => c.at >= start.getTime());
    },
  };

  window.Bills = api;
})();
