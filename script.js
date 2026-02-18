const $ = (id) => document.getElementById(id);

function n(v) {
  return Number.isFinite(v) ? v : 0;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, n(v)));
}

function parseRate(rawValue) {
  const raw = n(rawValue);
  const normalized = raw > 1 ? raw / 100 : raw;
  return clamp01(normalized);
}

function money(cur, amount) {
  const x = n(amount);
  const parts = x.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${cur} ${parts[0]}.${parts[1]}`;
}

function moneyHtml(cur, amount) {
  const cls = amount < 0 ? "bad" : "";
  return `<span class="${cls}">${money(cur, amount)}</span>`;
}

function parseCppList(raw) {
  return (raw || "")
    .split(",")
    .map((x) => parseFloat(x.trim()))
    .filter((x) => Number.isFinite(x) && x >= 0);
}

function read() {
  return {
    productName: $("productName").value.trim(),
    currency: ($("currency").value || "EGP").trim(),
    cost: n(parseFloat($("cost").value)),
    sellPrice: n(parseFloat($("sellPrice").value)),
    shipDelivered: n(parseFloat($("shipDelivered").value)),
    shipReturned: n(parseFloat($("shipReturned").value)),
    targetQty: Math.max(0, Math.round(n(parseFloat($("targetQty").value)))),
    confirmRate: parseRate(parseFloat($("confirmRate").value)),
    deliveryRate: parseRate(parseFloat($("deliveryRate").value)),
    cppList: parseCppList($("cppList").value)
  };
}

function calc(v, cpp) {
  const grossProfitPerPiece = v.sellPrice - v.cost;

  const confirmedOrders = Math.round(v.targetQty * v.confirmRate);
  const deliveredOrders = Math.round(confirmedOrders * v.deliveryRate);
  const returnedOrders = confirmedOrders - deliveredOrders;

  const deliveredShippingCost = deliveredOrders * v.shipDelivered;
  const returnedShippingCost = returnedOrders * v.shipReturned;
  const totalShippingCost = deliveredShippingCost + returnedShippingCost;
  const grossSales = deliveredOrders * v.sellPrice;
  const totalProductCost = deliveredOrders * v.cost;
  const targetProductPurchaseCost = v.targetQty * v.cost;
  const profitAfterProductCost = grossSales - totalProductCost;
  const profitAfterShipping = profitAfterProductCost - totalShippingCost;
  const totalAdsSpent = v.targetQty * n(cpp);
  const startupCapital = targetProductPurchaseCost + totalAdsSpent;
  const netProfit = profitAfterShipping - totalAdsSpent;

  return {
    grossProfitPerPiece,
    confirmedOrders,
    deliveredOrders,
    returnedOrders,
    deliveredShippingCost,
    returnedShippingCost,
    totalShippingCost,
    grossSales,
    totalProductCost,
    targetProductPurchaseCost,
    profitAfterProductCost,
    profitAfterShipping,
    totalAdsSpent,
    startupCapital,
    netProfit
  };
}

function render() {
  const v = read();
  const cppValues = v.cppList.length ? v.cppList : [0];
  const baseCpp = cppValues[0];
  const r = calc(v, baseCpp);
  const firstCpp = cppValues[0];
  const lastCpp = cppValues[cppValues.length - 1];
  const firstResult = calc(v, firstCpp);
  const lastResult = calc(v, lastCpp);

  const kpis = [
    {
      t: "Gross Profit للقطعة",
      v: money(v.currency, r.grossProfitPerPiece),
      cls: r.grossProfitPerPiece >= 0 ? "good" : "bad"
    },
    { t: "عدد الأوردرات المسلمة", v: r.deliveredOrders.toFixed(0), cls: "" },
    { t: "عدد الأوردرات المرتجعة", v: r.returnedOrders.toFixed(0), cls: "" },
    { t: "إجمالي مصاريف الشحن", v: money(v.currency, r.totalShippingCost), cls: "" },
    { t: "إجمالي المبيعات", v: money(v.currency, r.grossSales), cls: "" },
    { t: "تكلفة شراء المنتجات (التارجت)", v: money(v.currency, r.targetProductPurchaseCost), cls: "" },
    { t: "رأس المال الكافي للبدء", v: money(v.currency, r.startupCapital), cls: "" },
    {
      t: "الربح بعد تكلفة المنتجات",
      v: money(v.currency, r.profitAfterProductCost),
      cls: r.profitAfterProductCost >= 0 ? "good" : "bad"
    }
  ];

  $("kpis").innerHTML = kpis
    .map(
      (x) => `
        <div class="kpi">
          <div class="t">${x.t}</div>
          <div class="v ${x.cls}">${x.v}</div>
        </div>
      `
    )
    .join("");

  const details = [
    ["اسم المنتج", v.productName || "-"],
    ["التارجت", v.targetQty],
    ["عدد الأوردرات المؤكدة", r.confirmedOrders.toFixed(0)],
    ["عدد الأوردرات المسلمة", r.deliveredOrders.toFixed(0)],
    ["عدد الأوردرات المرتجعة", r.returnedOrders.toFixed(0)],
    ["إجمالي المبيعات (المسلمة × سعر البيع)", money(v.currency, r.grossSales)],
    ["إجمالي تكلفة المنتجات (المسلمة × تكلفة المنتج)", money(v.currency, r.totalProductCost)],
    ["الربح بعد تكلفة المنتجات", money(v.currency, r.profitAfterProductCost)],
    ["تكلفة شحن الأوردرات المسلمة", money(v.currency, r.deliveredShippingCost)],
    ["تكلفة شحن الأوردرات المرتجعة", money(v.currency, r.returnedShippingCost)],
    ["إجمالي مصاريف الشحن", money(v.currency, r.totalShippingCost)],
    ["Profit After Shipping", moneyHtml(v.currency, r.profitAfterShipping)],
    ["CPP الأساسي", `${money(v.currency, firstCpp)} | ${money(v.currency, lastCpp)}`],
    ["Total Ads Spent", `${money(v.currency, firstResult.totalAdsSpent)} | ${money(v.currency, lastResult.totalAdsSpent)}`],
    [
      "Net Profit",
      `${moneyHtml(v.currency, firstResult.netProfit)} | ${moneyHtml(v.currency, lastResult.netProfit)}`
    ]
  ];

  $("details").innerHTML = details
    .map(([k, val]) => `<tr><td>${k}</td><td>${val}</td></tr>`)
    .join("");

  $("adsRow").innerHTML = cppValues
    .map((cppVal) => {
      const rr = calc(v, cppVal);
      return `
          <tr>
            <td>${money(v.currency, cppVal)}</td>
            <td>${money(v.currency, rr.totalAdsSpent)}</td>
            <td class="${rr.netProfit >= 0 ? "good" : "bad"}">${money(v.currency, rr.netProfit)}</td>
          </tr>
        `;
    })
    .join("");
}

const ids = [
  "productName",
  "currency",
  "cost",
  "sellPrice",
  "shipDelivered",
  "shipReturned",
  "targetQty",
  "confirmRate",
  "deliveryRate",
  "cppList"
];

ids.forEach((id) => {
  $(id).addEventListener("input", render);
});

render();
