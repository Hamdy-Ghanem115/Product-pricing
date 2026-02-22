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

function moneyCellHtml(cur, amount) {
  return `<td class="${amount < 0 ? "bad" : ""}">${money(cur, amount)}</td>`;
}

function numberShort(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function createLineChartSvg(data, key, strokeColor) {
  const width = 540;
  const height = 230;
  const padL = 56;
  const padR = 16;
  const padT = 20;
  const padB = 42;
  const values = data.map((x) => n(x[key]));
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const x = (i) => (data.length === 1 ? padL + plotW / 2 : padL + (i * plotW) / (data.length - 1));
  const y = (val) => padT + ((max - val) / (max - min)) * plotH;

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(n(d[key])).toFixed(2)}`)
    .join(" ");

  const yLines = [0, 1, 2, 3, 4].map((i) => {
    const yPos = padT + (i * plotH) / 4;
    const val = max - (i * (max - min)) / 4;
    return `
      <line x1="${padL}" y1="${yPos}" x2="${width - padR}" y2="${yPos}" stroke="#d4deee" />
      <text x="${padL - 8}" y="${yPos + 4}" text-anchor="end" font-size="11" font-weight="700" fill="#3f5f88">${numberShort(val)}</text>
    `;
  });

  const xLabels = data
    .map((d, i) => `<text x="${x(i)}" y="${height - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#3f5f88">${esc(d.cpp)}</text>`)
    .join("");

  const points = data
    .map((d, i) => `<circle cx="${x(i)}" cy="${y(n(d[key]))}" r="4" fill="${strokeColor}" stroke="#fff" stroke-width="1.4" />`)
    .join("");

  const pointLabels = data
    .map((d, i) => {
      const yy = y(n(d[key]));
      const valTxt = numberShort(n(d[key]));
      const labelY = yy - 9;
      return `
        <rect x="${x(i) - 18}" y="${labelY - 11}" width="36" height="14" rx="4" fill="#ffffff" stroke="#d7e2f2" />
        <text x="${x(i)}" y="${labelY - 1}" text-anchor="middle" font-size="10" font-weight="700" fill="#27476f">${valTxt}</text>
      `;
    })
    .join("");

  const zeroLine =
    min < 0 && max > 0
      ? `<line x1="${padL}" y1="${y(0)}" x2="${width - padR}" y2="${y(0)}" stroke="#ef4444" stroke-dasharray="4 3" />`
      : "";

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
      ${yLines.join("")}
      ${zeroLine}
      <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="2.4" />
      ${points}
      ${pointLabels}
      ${xLabels}
      <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-size="10" fill="#5a708f">CPP</text>
    </svg>
  `;
}

function createBarChartSvg(data, key) {
  const width = 540;
  const height = 230;
  const padL = 56;
  const padR = 16;
  const padT = 20;
  const padB = 42;
  const values = data.map((x) => n(x[key]));
  let min = Math.min(...values, 0);
  let max = Math.max(...values, 0);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const y = (val) => padT + ((max - val) / (max - min)) * plotH;
  const yZero = y(0);
  const barGap = 10;
  const barW = Math.max(16, (plotW - barGap * (data.length - 1)) / Math.max(1, data.length));

  const bars = data
    .map((d, i) => {
      const v = n(d[key]);
      const x = padL + i * (barW + barGap);
      const yVal = y(v);
      const barY = v >= 0 ? yVal : yZero;
      const h = Math.max(1, Math.abs(yVal - yZero));
      const color = v >= 0 ? "#0e9f6e" : "#dc2626";
      const labelY = v >= 0 ? barY - 6 : barY + h + 12;
      return `
        <rect x="${x}" y="${barY}" width="${barW}" height="${h}" fill="${color}" opacity="0.9" />
        <text x="${x + barW / 2}" y="${labelY}" text-anchor="middle" font-size="10" font-weight="700" fill="#27476f">${numberShort(v)}</text>
        <text x="${x + barW / 2}" y="${height - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#3f5f88">${esc(d.cpp)}</text>
      `;
    })
    .join("");

  const yLines = [0, 1, 2, 3, 4].map((i) => {
    const yPos = padT + (i * plotH) / 4;
    const val = max - (i * (max - min)) / 4;
    return `
      <line x1="${padL}" y1="${yPos}" x2="${width - padR}" y2="${yPos}" stroke="#d4deee" />
      <text x="${padL - 8}" y="${yPos + 4}" text-anchor="end" font-size="11" font-weight="700" fill="#3f5f88">${numberShort(val)}</text>
    `;
  });

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
      ${yLines.join("")}
      <line x1="${padL}" y1="${yZero}" x2="${width - padR}" y2="${yZero}" stroke="#6b7280" stroke-width="1.2" />
      ${bars}
      <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-size="10" fill="#5a708f">CPP</text>
    </svg>
  `;
}

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const deliveryFromTargetRate = v.targetQty > 0 ? deliveredOrders / v.targetQty : 0;
  const returnRate = confirmedOrders > 0 ? returnedOrders / confirmedOrders : 0;

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
    netProfit,
    deliveryFromTargetRate,
    returnRate
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

  renderBuyerSalaryRows(v, cppValues);
  renderPrintReport(v, r, cppValues, firstCpp, lastCpp, firstResult, lastResult);
}

function renderBuyerSalaryRows(v, cppValues) {
  const body = $("buyerSalaryRows");
  body.innerHTML = cppValues
    .map((cppVal) => {
      const rr = calc(v, cppVal);
      const salary30Profit = rr.netProfit * 0.3;
      const salary30Ads = rr.totalAdsSpent * 0.3;
      const salary10ProfitPlusFixed = rr.netProfit * 0.1 + 9000;
      const salary5Sales = rr.grossSales * 0.05;

      return `
        <tr>
          <td>${money(v.currency, cppVal)}</td>
          <td>${money(v.currency, rr.totalAdsSpent)}</td>
          ${moneyCellHtml(v.currency, rr.netProfit)}
          ${moneyCellHtml(v.currency, salary30Profit)}
          ${moneyCellHtml(v.currency, salary30Ads)}
          ${moneyCellHtml(v.currency, salary10ProfitPlusFixed)}
          ${moneyCellHtml(v.currency, salary5Sales)}
        </tr>
      `;
    })
    .join("");
}

function renderPrintReport(v, r, cppValues, firstCpp, lastCpp, firstResult, lastResult) {
  const report = $("printReport");
  const now = new Date();
  const printDate = now.toLocaleString("ar-EG");
  const scenarios = cppValues.map((cppVal) => {
    const rr = calc(v, cppVal);
    return {
      cpp: cppVal,
      totalAdsSpent: rr.totalAdsSpent,
      netProfit: rr.netProfit,
      grossSales: rr.grossSales
    };
  });
  const bestScenario = scenarios.reduce((a, b) => (b.netProfit > a.netProfit ? b : a), scenarios[0]);
  const worstScenario = scenarios.reduce((a, b) => (b.netProfit < a.netProfit ? b : a), scenarios[0]);
  const positiveCount = scenarios.filter((x) => x.netProfit >= 0).length;
  const avgNet = scenarios.reduce((sum, x) => sum + x.netProfit, 0) / scenarios.length;
  const netProfitChart = createBarChartSvg(scenarios, "netProfit");
  const adsSpentChart = createLineChartSvg(scenarios, "totalAdsSpent", "#0a68ff");
  const salesChart = createLineChartSvg(scenarios, "grossSales", "#7c3aed");
  const rateMetrics = [
    { label: "نسبة التأكيدات", value: v.confirmRate },
    { label: "نسبة التسليم من المؤكد", value: v.deliveryRate },
    { label: "نسبة التسليم من التارجت", value: r.deliveryFromTargetRate },
    { label: "نسبة المرتجعات من المؤكد", value: r.returnRate }
  ];
  const maxCostMetric = Math.max(v.sellPrice, v.cost, v.shipDelivered, v.shipReturned, 1);
  const costMetrics = [
    { label: "سعر البيع للقطعة", value: v.sellPrice },
    { label: "تكلفة المنتج للقطعة", value: v.cost },
    { label: "شحن القطعة المسلمة", value: v.shipDelivered },
    { label: "شحن القطعة المرتجعة", value: v.shipReturned }
  ];

  const inputRows = [
    ["اسم المنتج", esc(v.productName || "-")],
    ["العملة", esc(v.currency)],
    ["تكلفة المنتج", money(v.currency, v.cost)],
    ["سعر البيع", money(v.currency, v.sellPrice)],
    ["شحن المسلَّم", money(v.currency, v.shipDelivered)],
    ["شحن المرتجع", money(v.currency, v.shipReturned)],
    ["التارجت", v.targetQty],
    ["نسبة التأكيد", `${(v.confirmRate * 100).toFixed(2)}%`],
    ["نسبة التسليم", `${(v.deliveryRate * 100).toFixed(2)}%`],
    ["CPP List", esc(cppValues.join(", "))]
  ];

  const summaryRows = [
    ["عدد الأوردرات المؤكدة", r.confirmedOrders.toFixed(0)],
    ["عدد الأوردرات المسلمة", r.deliveredOrders.toFixed(0)],
    ["عدد الأوردرات المرتجعة", r.returnedOrders.toFixed(0)],
    ["نسبة التأكيدات", `${(v.confirmRate * 100).toFixed(2)}%`],
    ["نسبة التسليم من المؤكد", `${(v.deliveryRate * 100).toFixed(2)}%`],
    ["نسبة التسليم من التارجت", `${(r.deliveryFromTargetRate * 100).toFixed(2)}%`],
    ["نسبة المرتجعات من المؤكد", `${(r.returnRate * 100).toFixed(2)}%`],
    ["إجمالي المبيعات", money(v.currency, r.grossSales)],
    ["إجمالي مصاريف الشحن", money(v.currency, r.totalShippingCost)],
    ["تكلفة شحن القطعة المسلمة", money(v.currency, v.shipDelivered)],
    ["تكلفة شحن القطعة المرتجعة", money(v.currency, v.shipReturned)],
    ["تكلفة شراء المنتجات (التارجت)", money(v.currency, r.targetProductPurchaseCost)],
    ["رأس المال الكافي للبدء", money(v.currency, r.startupCapital)],
    ["Profit After Shipping", money(v.currency, r.profitAfterShipping)],
    ["CPP الأساسي", `${money(v.currency, firstCpp)} | ${money(v.currency, lastCpp)}`],
    ["Total Ads Spent", `${money(v.currency, firstResult.totalAdsSpent)} | ${money(v.currency, lastResult.totalAdsSpent)}`],
    ["Net Profit", `${money(v.currency, firstResult.netProfit)} | ${money(v.currency, lastResult.netProfit)}`]
  ];

  const adsRowsHtml = cppValues
    .map((cppVal) => {
      const rr = calc(v, cppVal);
      return `
        <tr>
          <td>${money(v.currency, cppVal)}</td>
          <td>${money(v.currency, rr.totalAdsSpent)}</td>
          ${moneyCellHtml(v.currency, rr.netProfit)}
        </tr>
      `;
    })
    .join("");

  const salaryRowsHtml = cppValues
    .map((cppVal) => {
      const rr = calc(v, cppVal);
      return `
        <tr>
          <td>${money(v.currency, cppVal)}</td>
          <td>${money(v.currency, rr.totalAdsSpent)}</td>
          ${moneyCellHtml(v.currency, rr.netProfit)}
          ${moneyCellHtml(v.currency, rr.netProfit * 0.3)}
          ${moneyCellHtml(v.currency, rr.totalAdsSpent * 0.3)}
          ${moneyCellHtml(v.currency, rr.netProfit * 0.1 + 9000)}
          ${moneyCellHtml(v.currency, rr.grossSales * 0.05)}
        </tr>
      `;
    })
    .join("");

  report.innerHTML = `
    <div class="print-block">
      <h2>تقرير حاسبة ربحية المنتج</h2>
      <p class="print-meta">تاريخ الطباعة: ${esc(printDate)}</p>
    </div>

    <div class="print-block">
      <h2>المدخلات</h2>
      <table>
        <thead><tr><th>البند</th><th>القيمة</th></tr></thead>
        <tbody>
          ${inputRows.map(([k, val]) => `<tr><td>${k}</td><td>${val}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="print-block">
      <h2>الملخص</h2>
      <table>
        <thead><tr><th>البند</th><th>القيمة</th></tr></thead>
        <tbody>
          ${summaryRows.map(([k, val]) => `<tr><td>${k}</td><td>${val}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="print-block">
      <h2>تحليل البيانات</h2>
      <ul class="analysis-list">
        <li>أفضل سيناريو ربح عند CPP = ${money(v.currency, bestScenario.cpp)} بصافي ربح ${money(v.currency, bestScenario.netProfit)}.</li>
        <li>أضعف سيناريو عند CPP = ${money(v.currency, worstScenario.cpp)} بصافي ربح ${money(v.currency, worstScenario.netProfit)}.</li>
        <li>عدد السيناريوهات الإيجابية: ${positiveCount} من ${scenarios.length}.</li>
        <li>متوسط صافي الربح عبر كل السيناريوهات: ${money(v.currency, avgNet)}.</li>
      </ul>

      <div class="metric-grid">
        ${rateMetrics
          .map(
            (m) => `
              <div class="metric-card">
                <div class="metric-head">
                  <span>${m.label}</span>
                  <strong>${(m.value * 100).toFixed(1)}%</strong>
                </div>
                <div class="bar-track"><span class="bar-fill rate" style="width:${(m.value * 100).toFixed(2)}%"></span></div>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="metric-grid costs">
        ${costMetrics
          .map(
            (m) => `
              <div class="metric-card">
                <div class="metric-head">
                  <span>${m.label}</span>
                  <strong>${money(v.currency, m.value)}</strong>
                </div>
                <div class="bar-track"><span class="bar-fill cost" style="width:${((m.value / maxCostMetric) * 100).toFixed(2)}%"></span></div>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <h3>صافي الربح مقابل CPP</h3>
          ${netProfitChart}
        </div>
        <div class="chart-card">
          <h3>إجمالي مصروف الإعلانات مقابل CPP</h3>
          ${adsSpentChart}
        </div>
        <div class="chart-card">
          <h3>إجمالي المبيعات مقابل CPP</h3>
          ${salesChart}
        </div>
      </div>
    </div>

    <div class="print-block">
      <h2>Calculate Profit After Ads</h2>
      <table>
        <thead>
          <tr>
            <th>Average CPP</th>
            <th>Total Ads Spent</th>
            <th>Net Profit</th>
          </tr>
        </thead>
        <tbody>${adsRowsHtml}</tbody>
      </table>
    </div>

    <div class="print-block">
      <h2>تقسيم مرتب الميديا باير</h2>
      <table>
        <thead>
          <tr>
            <th>Average CPP</th>
            <th>Total Ads Spent</th>
            <th>Net Profit</th>
            <th>30% من الأرباح</th>
            <th>30% من مصروف الإعلانات</th>
            <th>10% من الأرباح + 9000</th>
            <th>5% من المبيعات</th>
          </tr>
        </thead>
        <tbody>${salaryRowsHtml}</tbody>
      </table>
    </div>
  `;
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

const modal = $("buyerSalaryModal");
const openModalBtn = $("openBuyerSalaryModal");
const closeModalBtn = $("closeBuyerSalaryModal");
const printReportBtn = $("printReportBtn");

openModalBtn.addEventListener("click", () => {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
});

printReportBtn.addEventListener("click", () => {
  window.print();
});

render();
