// Interactive Plotly charts for the TDA-finance project.
// Data source: ../assets/data/05-tda.json (written by scripts/export_json.py of the project)

(function () {
  "use strict";

  const DATA_URL = "../assets/data/05-tda.json";
  const COLORS = { purple: "#7c5cff", cyan: "#22d3ee", pink: "#f472b6", amber: "#fbbf24" };
  const FONT_FAMILY = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const MONO_FAMILY = "ui-monospace, 'JetBrains Mono', 'SF Mono', Consolas, monospace";

  const axisStyle = {
    gridcolor: "rgba(255,255,255,0.05)",
    zerolinecolor: "rgba(255,255,255,0.12)",
    linecolor: "rgba(255,255,255,0.2)",
    tickfont: { color: "#9aa3b8", size: 11, family: MONO_FAMILY },
    titlefont: { color: "#e7ecf5", size: 12, family: FONT_FAMILY },
    mirror: true,
  };

  const baseLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(12,16,28,0.35)",
    font: { color: "#e7ecf5", family: FONT_FAMILY, size: 12 },
    margin: { t: 50, r: 30, b: 45, l: 70 },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: "rgba(13,18,32,0.96)",
      bordercolor: "rgba(124,92,255,0.55)",
      font: { color: "#e7ecf5", family: MONO_FAMILY, size: 12 },
    },
    legend: {
      bgcolor: "rgba(255,255,255,0.04)", bordercolor: "rgba(255,255,255,0.08)", borderwidth: 1,
      font: { color: "#e7ecf5", size: 12 }, orientation: "h", y: -0.12, x: 0.5, xanchor: "center",
    },
  };

  const plotlyConfig = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d", "select2d", "autoScale2d"],
    toImageButtonOptions: { format: "png", filename: "camilo-rozo-tda-finance", scale: 2 },
  };

  function line(x, y, name, color, yaxis, extra) {
    return Object.assign({
      x, y, name, yaxis, type: "scatter", mode: "lines",
      line: { color, width: 1.4 },
      hovertemplate: "%{y:.3f}<extra>" + name + "</extra>",
    }, extra || {});
  }

  function renderFeatures(Plotly, d) {
    const traces = [
      line(d.dates, d.volatility, "realised volatility (% / day)", COLORS.cyan, "y"),
      line(d.dates, d.eigenvalue, "leading eigenvalue share", COLORS.cyan, "y2", { showlegend: false }),
      line(d.dates, d.l1_h0, "landscape L¹ norm, H₀ (components)", COLORS.purple, "y3"),
      line(d.dates, d.l1_h1, "landscape L¹ norm, H₁ (loops)", COLORS.pink, "y4"),
    ];
    const shapes = d.crises.map(c => ({
      type: "rect", xref: "x", yref: "paper", x0: c.start, x1: c.end, y0: 0, y1: 1,
      fillcolor: "rgba(251,191,36,0.13)", line: { width: 0 }, layer: "below",
    }));
    const annotations = d.crises.map(c => ({
      x: c.start, y: 1.02, xref: "x", yref: "paper", text: c.name, showarrow: false,
      xanchor: "left", font: { color: COLORS.amber, size: 11, family: MONO_FAMILY },
    }));
    const layout = Object.assign({}, baseLayout, {
      height: 620,
      xaxis: Object.assign({}, axisStyle, { anchor: "y4" }),
      yaxis: Object.assign({}, axisStyle, { domain: [0.78, 1.0], title: "volatility %" }),
      yaxis2: Object.assign({}, axisStyle, { domain: [0.53, 0.74], title: "eigen. share" }),
      yaxis3: Object.assign({}, axisStyle, { domain: [0.27, 0.49], title: "L¹, H₀" }),
      yaxis4: Object.assign({}, axisStyle, { domain: [0.0, 0.23], title: "L¹, H₁" }),
      shapes, annotations,
    });
    Plotly.newPlot("chart-features", traces, layout, plotlyConfig);
  }

  function renderReplication(Plotly, g) {
    const traces = [
      line(g.dates, g.l1, "L¹ norm of the H₁ landscape (×10⁵)", COLORS.purple, "y", { line: { color: COLORS.purple, width: 1 } }),
      line(g.dates, g.volatility, "realised volatility (% / day)", COLORS.cyan, "y2", { line: { color: COLORS.cyan, width: 1.2 } }),
    ];
    const shapes = [], annotations = [];
    g.crashes.forEach(c => {
      const i = g.dates.findIndex(t => t >= c.date);
      const start = g.dates[Math.max(0, i - 125)];        // 250 trading days, every second day
      shapes.push({ type: "rect", xref: "x", yref: "paper", x0: start, x1: c.date, y0: 0, y1: 1,
                    fillcolor: "rgba(251,191,36,0.13)", line: { width: 0 }, layer: "below" });
      shapes.push({ type: "line", xref: "x", yref: "paper", x0: c.date, x1: c.date, y0: 0, y1: 1,
                    line: { color: COLORS.amber, width: 1.2 } });
      annotations.push({ x: c.date, y: 1.03, xref: "x", yref: "paper", text: c.name + " · " + c.date,
                         showarrow: false, xanchor: "right", font: { color: COLORS.amber, size: 11, family: MONO_FAMILY } });
    });
    const layout = Object.assign({}, baseLayout, {
      height: 420,
      xaxis: Object.assign({}, axisStyle),
      yaxis: Object.assign({}, axisStyle, { title: "L¹ norm ×10⁵" }),
      yaxis2: Object.assign({}, axisStyle, { title: "volatility", overlaying: "y", side: "right", showgrid: false }),
      margin: { t: 50, r: 70, b: 45, l: 70 },
      shapes, annotations,
    });
    Plotly.newPlot("chart-replication", traces, layout, plotlyConfig);
  }

  function showFailure(message) {
    ["chart-features", "chart-replication"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="chart-error">Could not load chart data — ${message}</div>`;
    });
  }

  function init() {
    if (typeof Plotly === "undefined") { showFailure("Plotly not available"); return; }
    fetch(DATA_URL, { cache: "no-cache" })
      .then(resp => { if (!resp.ok) throw new Error(`HTTP ${resp.status}`); return resp.json(); })
      .then(payload => {
        document.querySelectorAll("[id^=chart-] .chart-loading").forEach((n) => n.remove());
        renderFeatures(Plotly, payload.study1);
        renderReplication(Plotly, payload.gk);
      })
      .catch(err => { console.error("[05-tda] failed to load chart data", err); showFailure(err.message); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
