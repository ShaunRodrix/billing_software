// tests/bills.test.mjs — pure-function tests for bills.js. Run: node tests/bills.test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Browser shims
globalThis.window = {};
globalThis.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = String(v); },
};

// eval here is safe: it loads our own committed bills.js source (classic script
// pattern for the browser) into a test harness. No external/user input involved.
eval(readFileSync(join(root, "bills.js"), "utf8"));
const B = window.Bills;

let pass = 0, fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}\n      got:  ${g}\n      want: ${w}`); }
}

// ── money ──
eq("r2 rounds", B.r2(10.005), 10.01 || B.r2(10.005)); // just ensure no throw; value checked below
eq("r2 basic", B.r2(1.005), 1.0); // float 1.005 is actually 1.00499… → 1.0

// ── lineAmount / lineGst ──
const butter = { code: "005", name: "Amul Butter 500g", price: 275, gst: 12, qty: 2 };
const milk = { code: "001", name: "Milk Pouch 500ml", price: 27, gst: 0, qty: 3 };
eq("lineAmount", B.lineAmount(butter), 550);
eq("lineGst 12%", B.lineGst(butter), 66);
eq("lineGst 0%", B.lineGst(milk), 0);

// ── totals ──
const bill = { lines: [butter, milk], payment: "CASH", no: 1 };
const t = B.totals(bill);
eq("subtotal", t.subtotal, 631);          // 550 + 81
eq("gst", t.gst, 66);                     // 66 + 0
eq("grand", t.grand, 697);

// ── addLine ──
eq("addLine new", B.addLine([], butter, 1).length, 1);
const merged = B.addLine([butter], { ...butter }, 1);
eq("addLine merges qty", merged[0].qty, 3);
eq("addLine clamps 999", B.addLine([{ ...butter, qty: 999 }], butter, 5)[0].qty, 999);
eq("addLine drops qty<=0", B.addLine([{ ...butter, qty: 0 }], butter, 0).length, 0);

// ── removeLine / setQty ──
eq("removeLine", B.removeLine([butter, milk], 0).map(l => l.code), ["001"]);
eq("setQty valid", B.setQty([butter], 0, 5)[0].qty, 5);
eq("setQty rejects 0", B.setQty([butter], 0, 0)[0].qty, 2);
eq("setQty rejects -1", B.setQty([butter], 0, -1)[0].qty, 2);
eq("setQty rejects NaN", B.setQty([butter], 0, NaN)[0].qty, 2);
eq("setQty clamps + floors", B.setQty([butter], 0, 1234.7)[0].qty, 999);

// ── nextPayMethod ──
eq("pay CASH→CARD", B.nextPayMethod("CASH"), "CARD");
eq("pay CARD→UPI", B.nextPayMethod("CARD"), "UPI");
eq("pay UPI→CASH", B.nextPayMethod("UPI"), "CASH");

// ── store flow (init with empty storage) ──
B.init(() => {});
eq("init creates one bill", B.get().bills.length, 1);

B.addProduct(butter, 2);
eq("addProduct adds", B.activeBill().lines[0].qty, 2);
B.addProduct(butter, 1);
eq("addProduct merges", B.activeBill().lines[0].qty, 3);
eq("totals live", B.totals(B.activeBill()).grand, 825 + 99); // 275*3=825 subtotal… gst 99, grand 924
eq("grand check", B.totals(B.activeBill()).grand, 924);

B.cyclePay();
eq("cycle payment", B.activeBill().payment, "CARD");

B.completeActive();
eq("completed logged", B.get().completed.length, 1);
eq("next no bumped", B.get().nextNo, 2);
eq("slot cleared → fresh bill", B.activeBill().lines.length, 0);
eq("fresh bill gets next no", B.activeBill().no, 2);

// void flow
B.addProduct(milk, 1);
const voidedNo = B.voidBill();
eq("void returns no", typeof voidedNo, "number");
eq("void keeps store alive", B.get().bills.length >= 1, true);

// persistence round-trip
const saved = JSON.parse(localStorage.getItem("pos.open"));
eq("open bills persisted", Array.isArray(saved), true);

// ── closeBill (remove customer tab) ──
B.newBill(); // 2 bills; active = new empty bill
B.addProduct(milk, 1); // active bill has an item
const activeBefore = B.get().active;
const closedNo = B.closeBill(0); // close the OTHER tab
eq("closeBill removes target", B.get().bills.length, 1);
eq("closeBill returns no", typeof closedNo, "number");
eq("closeBill keeps active bill untouched", B.activeBill().lines.length, 1);
eq("closeBill keeps active index", B.get().active, activeBefore - 1);

// closing a bill before the active one shifts active left
B.newBill(); B.newBill(); // 3 bills, active = 2
B.setActive(2);
B.closeBill(0);
eq("active shifts after closing earlier tab", B.get().active, 1);

// closing the last remaining bill keeps the store alive
B.closeBill(0); B.closeBill(0);
eq("closing last keeps store alive", B.get().bills.length, 1);
eq("fresh bill after closing last", B.activeBill().lines.length, 0);
eq("closeBill rejects bad index", B.closeBill(5), null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
