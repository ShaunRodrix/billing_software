// print.js — 58mm receipt rendering + pay/print flow. Classic script → window.Print
// Built with DOM APIs (textContent) — no HTML interpolation of data.
(function () {
  const pad2 = (n) => String(n).padStart(2, "0");
  const money = (n) => n.toFixed(2);

  function stamp(at) {
    const d = new Date(at);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function el(cls, text) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }

  function render(bill, t) {
    const area = document.getElementById("print-area");
    area.textContent = "";

    const head = el("r-head");
    head.append(el("r-store", "MART"), el("r-sub", `Bill #${String(bill.no).padStart(4, "0")} · ${stamp(bill.openedAt)}`));

    area.append(head, el("r-rule"));

    for (const l of bill.lines) {
      const line = el("r-line");
      line.append(
        el("r-name", `${l.qty} x ${l.name}`),
        el("r-amt", money(l.price * l.qty)),
        el("r-rate", `@ ${money(l.price)} · GST ${l.gst}%`)
      );
      area.append(line);
    }

    area.append(el("r-rule"));

    const row = (label, value, cls) => {
      const r = el("r-row" + (cls ? " " + cls : ""));
      r.append(el(null, label), el(null, value));
      return r;
    };
    area.append(
      row("Subtotal", money(t.subtotal)),
      row("GST", money(t.gst)),
      row("TOTAL", `Rs. ${money(t.grand)}`, "r-grand"),
      row("Payment", bill.payment),
      el("r-rule"),
      el("r-thanks", "Thank you · Visit again")
    );
  }

  function pay(bill, totalsFn, onComplete) {
    if (!bill.lines.length) return false;
    render(bill, totalsFn(bill));
    const done = () => {
      window.removeEventListener("afterprint", done);
      onComplete();
    };
    window.addEventListener("afterprint", done);
    window.print();
    return true;
  }

  window.Print = { pay };
})();
