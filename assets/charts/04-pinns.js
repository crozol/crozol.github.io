// Interactive Plotly charts for the Physics-Informed Neural Networks project.
// Data source: ../assets/data/04-pinns.json

(function () {
  "use strict";

  const DATA_URL = "../assets/data/04-pinns.json";

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
      format: "png", filename: "camilo-rozo-pinns", scale: 2,
    },
  };

  // ---------- charts ----------

  function fieldExtent(field) {
    let m = 0;
    for (const row of field) for (const v of row) m = Math.max(m, Math.abs(v));
    return m || 1;
  }

  function renderHeatmap(Plotly, divId, equation, data) {
    const vmax = Math.max(fieldExtent(data.ref), fieldExtent(data.pred));
    const dmax = fieldExtent(data.diff);

    const trace = {
      type: "heatmap",
      x: data.x, y: data.t, z: data.ref,
      colorscale: "RdBu",
      zmin: -vmax, zmax: vmax, zmid: 0,
      colorbar: { tickfont: { color: "#9aa3b8", size: 10, family: MONO_FAMILY } },
      hovertemplate: "x = %{x:.3f}<br>t = %{y:.3f}<br>u = %{z:.4f}<extra></extra>",
    };

    const layout = Object.assign({}, baseLayout, {
      title: { text: `${equation} — Reference`, font: { color: "#e7ecf5", size: 14, family: FONT_FAMILY } },
      xaxis: Object.assign({}, axisStyle, { title: "x" }),
      yaxis: Object.assign({}, axisStyle, { title: "t", autorange: "reversed" }),
      updatemenus: [{
        type: "buttons", direction: "right", x: 1, xanchor: "right", y: 1.18, yanchor: "top",
        bgcolor: "rgba(255,255,255,0.04)", bordercolor: "rgba(255,255,255,0.12)",
        font: { color: "#e7ecf5", size: 11, family: MONO_FAMILY },
        buttons: [
          {
            label: "Reference", method: "update",
            args: [{ z: [data.ref], zmin: -vmax, zmax: vmax, colorscale: "RdBu" },
                   { "title.text": `${equation} — Reference` }],
          },
          {
            label: "PINN", method: "update",
            args: [{ z: [data.pred], zmin: -vmax, zmax: vmax, colorscale: "RdBu" },
                   { "title.text": `${equation} — PINN` }],
          },
          {
            label: "PINN − Reference", method: "update",
            args: [{ z: [data.diff], zmin: -dmax, zmax: dmax, colorscale: "RdBu" },
                   { "title.text": `${equation} — PINN − Reference (error)` }],
          },
        ],
      }],
    });

    Plotly.newPlot(divId, [trace], layout, plotlyConfig);
  }

  function renderSlices(Plotly, divId, equation, slices) {
    const palette = [COLORS.cyan, COLORS.purple, COLORS.amber, COLORS.pink];
    const traces = [];
    slices.t_values.forEach((tVal, i) => {
      const color = palette[i % palette.length];
      traces.push({
        x: slices.x, y: slices.ref[i], mode: "lines",
        line: { color, width: 2.0 },
        name: `t = ${tVal.toFixed(2)} · reference`,
        legendgroup: `t${i}`,
        hovertemplate: `t=${tVal.toFixed(2)}<br>x = %{x:.3f}<br>u = %{y:.4f}<extra>reference</extra>`,
      });
      traces.push({
        x: slices.x, y: slices.pred[i], mode: "lines",
        line: { color, width: 2.0, dash: "dot" },
        name: `t = ${tVal.toFixed(2)} · PINN`,
        legendgroup: `t${i}`,
        hovertemplate: `t=${tVal.toFixed(2)}<br>x = %{x:.3f}<br>u = %{y:.4f}<extra>PINN</extra>`,
      });
    });

    const layout = Object.assign({}, baseLayout, {
      title: { text: `${equation} — u(x) at fixed t (solid = reference, dotted = PINN)`,
                font: { color: "#e7ecf5", size: 13, family: FONT_FAMILY } },
      xaxis: Object.assign({}, axisStyle, { title: "x" }),
      yaxis: Object.assign({}, axisStyle, { title: "u" }),
    });

    Plotly.newPlot(divId, traces, layout, plotlyConfig);
  }

  function renderBurgersLoss(Plotly, divId, loss) {
    const traces = [
      {
        x: loss.adam_step, y: loss.adam, mode: "lines",
        line: { color: COLORS.cyan, width: 2.0 },
        name: "Adam (resampled mini-batches)",
        hovertemplate: "step %{x}<br>loss = %{y:.4e}<extra></extra>",
      },
    ];
    if (loss.lbfgs && loss.lbfgs.length) {
      traces.push({
        x: loss.lbfgs_step, y: loss.lbfgs, mode: "lines",
        line: { color: COLORS.pink, width: 2.0, dash: "dot" },
        name: "L-BFGS (fixed batch)",
        hovertemplate: "step %{x}<br>loss = %{y:.4e}<extra></extra>",
      });
    }

    const layout = Object.assign({}, baseLayout, {
      title: { text: "Burgers PINN training loss — Adam plateaus, L-BFGS does not",
                font: { color: "#e7ecf5", size: 14, family: FONT_FAMILY } },
      xaxis: Object.assign({}, axisStyle, { title: "optimizer step" }),
      yaxis: Object.assign({}, axisStyle, { title: "composite loss (log scale)", type: "log" }),
    });

    Plotly.newPlot(divId, traces, layout, plotlyConfig);
  }

  function renderAll(Plotly, payload) {
    renderHeatmap(Plotly, "chart-heat-field", "Heat equation", payload.heat);
    renderSlices(Plotly, "chart-heat-slices", "Heat equation", payload.heat.slices);
    renderHeatmap(Plotly, "chart-burgers-field", "Burgers equation", payload.burgers);
    renderSlices(Plotly, "chart-burgers-slices", "Burgers equation", payload.burgers.slices);
    renderBurgersLoss(Plotly, "chart-burgers-loss", payload.burgers.loss);
  }

  // ---------- bootstrap ----------

  function showFailure(message) {
    const ids = ["chart-heat-field", "chart-heat-slices", "chart-burgers-field", "chart-burgers-slices", "chart-burgers-loss"];
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
        console.error("[04-pinns] failed to load chart data", err);
        showFailure(err.message);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
