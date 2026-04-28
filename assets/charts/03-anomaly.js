// Interactive Plotly charts for the Anomaly Detection project.
// Data source: ../assets/data/03-anomaly.json

(function () {
  "use strict";

  const DATA_URL = "../assets/data/03-anomaly.json";

  const COLORS = {
    purple: "#7c5cff",
    cyan:   "#22d3ee",
    pink:   "#f472b6",
    amber:  "#fbbf24",
    green:  "#34d399",
    gray:   "rgba(154,163,184,0.55)",
  };

  const FONT_FAMILY = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const MONO_FAMILY = "ui-monospace, 'JetBrains Mono', 'SF Mono', Consolas, monospace";

  const spikeStyle = {
    showspikes: true,
    spikemode: "across",
    spikesnap: "cursor",
    spikecolor: "rgba(124,92,255,0.5)",
    spikethickness: 1,
    spikedash: "dot",
  };

  const axisStyle = Object.assign({
    gridcolor: "rgba(255,255,255,0.05)",
    zerolinecolor: "rgba(255,255,255,0.12)",
    linecolor: "rgba(255,255,255,0.2)",
    tickfont: { color: "#9aa3b8", size: 11, family: MONO_FAMILY },
    titlefont: { color: "#e7ecf5", size: 13, family: FONT_FAMILY },
    mirror: true,
  }, spikeStyle);

  const baseLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor:  "rgba(12,16,28,0.35)",
    font: { color: "#e7ecf5", family: FONT_FAMILY, size: 12 },
    margin: { t: 60, r: 30, b: 55, l: 65 },
    hoverlabel: {
      bgcolor: "rgba(13,18,32,0.96)",
      bordercolor: "rgba(124,92,255,0.55)",
      font: { color: "#e7ecf5", family: MONO_FAMILY, size: 12 },
    },
    legend: {
      bgcolor: "rgba(255,255,255,0.04)",
      bordercolor: "rgba(255,255,255,0.08)",
      borderwidth: 1,
      font: { color: "#e7ecf5", size: 12 },
      orientation: "h",
      y: -0.20, x: 0.5, xanchor: "center",
    },
  };

  const plotlyConfig = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      "sendDataToCloud", "lasso2d", "select2d",
      "autoScale2d", "hoverClosestCartesian", "hoverCompareCartesian",
    ],
    toImageButtonOptions: {
      format: "png", filename: "camilo-rozo-anomaly", scale: 2,
    },
  };

  // ---------- charts ----------

  function renderLoss(Plotly, payload) {
    const loss = payload.loss;
    if (!loss || !loss.train) return;

    const traces = [
      {
        x: loss.epoch, y: loss.train, mode: "lines",
        line: { color: COLORS.cyan, width: 2.0, shape: "spline", smoothing: 0.4 },
        name: "training MSE",
        hovertemplate: "epoch %{x}<br>train MSE = %{y:.4f}<extra></extra>",
      },
      {
        x: loss.epoch, y: loss.val, mode: "lines",
        line: { color: COLORS.purple, width: 2.0, shape: "spline", smoothing: 0.4 },
        name: "validation MSE",
        hovertemplate: "epoch %{x}<br>val MSE = %{y:.4f}<extra></extra>",
      },
    ];

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "Training and validation MSE on healthy CMAPSS windows",
        font: { color: "#e7ecf5", size: 14, family: FONT_FAMILY },
      },
      xaxis: Object.assign({}, axisStyle, { title: "epoch" }),
      yaxis: Object.assign({}, axisStyle, { title: "MSE (log scale)", type: "log" }),
    });

    Plotly.newPlot("chart-loss", traces, layout, plotlyConfig);
  }

  function renderHistograms(Plotly, payload) {
    const h = payload.histograms;
    const threshold = h.threshold;

    // Anomalous histogram defines the x-range; pad the healthy bars to align.
    const traces = [
      {
        x: h.healthy.centers, y: h.healthy.counts, type: "bar",
        marker: { color: "rgba(34,211,238,0.55)", line: { width: 0 } },
        name: "healthy (RUL > 30)",
        hovertemplate: "MSE ≈ %{x:.3f}<br>n = %{y}<extra></extra>",
      },
      {
        x: h.anomalous.centers, y: h.anomalous.counts, type: "bar",
        marker: { color: "rgba(251,191,36,0.7)", line: { width: 0 } },
        name: "anomalous (RUL ≤ 30)",
        hovertemplate: "MSE ≈ %{x:.3f}<br>n = %{y}<extra></extra>",
      },
    ];

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "Per-window reconstruction MSE on the test split",
        font: { color: "#e7ecf5", size: 14, family: FONT_FAMILY },
      },
      barmode: "overlay",
      xaxis: Object.assign({}, axisStyle, { title: "reconstruction MSE per window" }),
      yaxis: Object.assign({}, axisStyle, { title: "count (log scale)", type: "log" }),
      shapes: [
        {
          type: "line", xref: "x", yref: "paper",
          x0: threshold, x1: threshold, y0: 0, y1: 1,
          line: { color: COLORS.pink, width: 1.6, dash: "dash" },
        },
      ],
      annotations: [
        {
          x: threshold, y: 1, xref: "x", yref: "paper",
          text: `τ = ${threshold.toFixed(3)}`,
          showarrow: false, yanchor: "bottom", xanchor: "left",
          xshift: 4,
          font: { color: COLORS.pink, family: MONO_FAMILY, size: 11 },
        },
      ],
    });

    Plotly.newPlot("chart-histograms", traces, layout, plotlyConfig);
  }

  function renderRoc(Plotly, payload) {
    const roc = payload.roc;
    const ev = payload.metrics.evaluation;
    const opFpr = ev.confusion.fp / Math.max(ev.confusion.fp + ev.confusion.tn, 1);
    const opTpr = ev.confusion.tp / Math.max(ev.confusion.tp + ev.confusion.fn, 1);

    const traces = [
      {
        x: [0, 1], y: [0, 1], mode: "lines",
        line: { color: COLORS.gray, width: 1.0, dash: "dash" },
        name: "random classifier",
        hoverinfo: "skip",
      },
      {
        x: roc.fpr, y: roc.tpr, mode: "lines", fill: "tozeroy",
        fillcolor: "rgba(124,92,255,0.10)",
        line: { color: COLORS.purple, width: 2.2 },
        name: `autoencoder (AUC = ${roc.auc.toFixed(3)})`,
        hovertemplate: "FPR = %{x:.3f}<br>TPR = %{y:.3f}<extra></extra>",
      },
      {
        x: [opFpr], y: [opTpr], mode: "markers",
        marker: { color: COLORS.pink, size: 11, line: { color: "#0d1220", width: 1.5 } },
        name: "q99 threshold",
        hovertemplate: `q99: FPR = ${opFpr.toFixed(3)}<br>TPR = ${opTpr.toFixed(3)}<extra></extra>`,
      },
    ];

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "ROC · score vs RUL ≤ 30 label",
        font: { color: "#e7ecf5", size: 14, family: FONT_FAMILY },
      },
      xaxis: Object.assign({}, axisStyle, { title: "false positive rate", range: [-0.01, 1.01] }),
      yaxis: Object.assign({}, axisStyle, { title: "true positive rate",
                                             range: [-0.01, 1.01], scaleanchor: "x", scaleratio: 1 }),
    });

    Plotly.newPlot("chart-roc", traces, layout, plotlyConfig);
  }

  function renderEngine(Plotly, payload) {
    if (!payload.engines || payload.engines.length === 0) return;
    const eng = payload.engines[0];        // most informative engine first
    const threshold = payload.histograms.threshold;
    const cutoff = payload.anomaly_cutoff;

    // Index axis: position along trajectory (early → late).
    const xs = eng.rul.map((_, i) => i);
    const cutoffIndex = (() => {
      let bestIdx = xs.length - 1, bestDiff = Infinity;
      for (let i = 0; i < eng.rul.length; i++) {
        const d = Math.abs(eng.rul[i] - cutoff);
        if (d < bestDiff) { bestDiff = d; bestIdx = i; }
      }
      return bestIdx;
    })();

    const traces = [
      {
        x: xs, y: eng.err, mode: "lines",
        line: { color: COLORS.purple, width: 2.0, shape: "spline", smoothing: 0.3 },
        name: `engine #${eng.unit}`,
        hovertemplate: "window %{x}<br>RUL = %{customdata:.0f}<br>MSE = %{y:.3f}<extra></extra>",
        customdata: eng.rul,
      },
    ];

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: `Per-engine reconstruction error · engine #${eng.unit}`,
        font: { color: "#e7ecf5", size: 14, family: FONT_FAMILY },
      },
      xaxis: Object.assign({}, axisStyle, { title: "window index along trajectory (early → late)" }),
      yaxis: Object.assign({}, axisStyle, { title: "reconstruction MSE" }),
      shapes: [
        {
          type: "rect", xref: "x", yref: "paper",
          x0: cutoffIndex, x1: xs[xs.length - 1], y0: 0, y1: 1,
          fillcolor: "rgba(251,191,36,0.10)", line: { width: 0 },
          layer: "below",
        },
        {
          type: "line", xref: "paper", yref: "y",
          x0: 0, x1: 1, y0: threshold, y1: threshold,
          line: { color: COLORS.pink, width: 1.4, dash: "dash" },
        },
      ],
      annotations: [
        {
          x: 1, y: threshold, xref: "paper", yref: "y",
          text: `τ = ${threshold.toFixed(3)}`,
          showarrow: false, yanchor: "bottom", xanchor: "right",
          font: { color: COLORS.pink, family: MONO_FAMILY, size: 11 },
        },
        {
          x: (cutoffIndex + xs[xs.length - 1]) / 2,
          y: 1, xref: "x", yref: "paper",
          text: `RUL ≤ ${cutoff}`, showarrow: false, yanchor: "bottom",
          font: { color: COLORS.amber, family: MONO_FAMILY, size: 11 },
        },
      ],
    });

    Plotly.newPlot("chart-engine", traces, layout, plotlyConfig);
  }

  function renderAll(Plotly, payload) {
    renderLoss(Plotly, payload);
    renderHistograms(Plotly, payload);
    renderRoc(Plotly, payload);
    renderEngine(Plotly, payload);
  }

  // ---------- bootstrap ----------

  function showFailure(message) {
    const ids = ["chart-loss", "chart-histograms", "chart-roc", "chart-engine"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML =
          `<div class="chart-error">Could not load chart data — ${message}</div>`;
      }
    });
  }

  function init() {
    if (typeof Plotly === "undefined") {
      showFailure("Plotly not available");
      return;
    }

    fetch(DATA_URL, { cache: "no-cache" })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(payload => renderAll(Plotly, payload))
      .catch(err => {
        console.error("[03-anomaly] failed to load chart data", err);
        showFailure(err.message);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
