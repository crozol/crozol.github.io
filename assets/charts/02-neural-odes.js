// Interactive Plotly charts for the Neural ODEs project.
// Data source: ../assets/data/02-neural-odes.json

(function () {
  "use strict";

  const DATA_URL = "../assets/data/02-neural-odes.json";

  const COLORS = {
    purple: "#7c5cff",
    cyan:   "#22d3ee",
    pink:   "#f472b6",
    amber:  "#fbbf24",
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
      y: -0.18, x: 0.5, xanchor: "center",
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
      format: "png", filename: "camilo-rozo-neural-odes", scale: 2,
    },
  };

  // ---------- helpers ----------

  function col(traj, k) {
    const out = new Array(traj.length);
    for (let i = 0; i < traj.length; i++) out[i] = traj[i][k];
    return out;
  }

  function shadedExtrap(t_train, t_max, axisRefY) {
    return {
      type: "rect", xref: "x", yref: axisRefY,
      x0: t_train, x1: t_max, y0: 0, y1: 1,
      fillcolor: "rgba(251,191,36,0.07)", line: { width: 0 },
      layer: "below",
    };
  }

  function vlineTrainEnd(t_train, axisRefY) {
    return {
      type: "line", xref: "x", yref: axisRefY,
      x0: t_train, x1: t_train, y0: 0, y1: 1,
      line: { color: COLORS.amber, dash: "dash", width: 1.6 },
    };
  }

  // ---------- loss plot (shared) ----------

  function renderLoss(Plotly, divId, payload, systemName) {
    const history = payload.loss_history;
    const epochs = history.map((_, i) =>
      Math.round(i * (payload.metrics.epochs / Math.max(history.length - 1, 1)))
    );
    const initial = history[0];
    const final = history[history.length - 1];
    const best = history.reduce((a, b) => Math.min(a, b), history[0]);
    const reduction = initial / Math.max(final, 1e-12);

    const trace = {
      x: epochs, y: history,
      mode: "lines",
      line: { color: COLORS.purple, width: 2.0, shape: "spline", smoothing: 0.4 },
      name: "training MSE",
      hovertemplate: "epoch %{x}<br>MSE = %{y:.3e}<extra></extra>",
    };

    const grow = payload.grow_every;
    const totalEpochs = payload.metrics.epochs;
    const shapes = [];
    if (grow && grow > 0) {
      for (let x = grow; x < totalEpochs; x += grow) {
        shapes.push({
          type: "line", xref: "x", yref: "paper",
          x0: x, x1: x, y0: 0, y1: 1,
          line: { color: COLORS.amber, dash: "dash", width: 0.7 },
          opacity: 0.45,
        });
      }
    }

    const info = (
      "initial MSE = " + initial.toExponential(2) + "<br>" +
      "final   MSE = " + final.toExponential(2) + "<br>" +
      "best    MSE = " + best.toExponential(2) + "<br>" +
      "reduction   = " + reduction.toLocaleString(undefined, { maximumFractionDigits: 0 }) + "×"
    );

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Training loss</b> · " + systemName,
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left",
      },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "epoch", font: axisStyle.titlefont },
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: "training MSE  (log)", font: axisStyle.titlefont },
        type: "log",
      }),
      shapes: shapes,
      annotations: [
        {
          x: 0.99, y: 0.97, xref: "paper", yref: "paper",
          xanchor: "right", yanchor: "top",
          text: info, showarrow: false, align: "right",
          bgcolor: "rgba(13,18,32,0.9)",
          bordercolor: "rgba(124,92,255,0.55)",
          borderwidth: 1, borderpad: 8,
          font: { color: "#e7ecf5", size: 11, family: MONO_FAMILY },
        },
        grow ? {
          x: 0.012, y: 0.05, xref: "paper", yref: "paper",
          xanchor: "left", yanchor: "bottom",
          text: "amber dashed · curriculum window grows every " + grow + " epochs",
          showarrow: false,
          font: { color: "#9aa3b8", size: 11, family: MONO_FAMILY, italic: true },
        } : null,
      ].filter(Boolean),
      showlegend: false,
      hovermode: "x",
    });

    Plotly.newPlot(divId, [trace], layout, plotlyConfig);
  }

  // ---------- trajectory plot (shared) ----------

  function renderTrajectory(Plotly, divId, payload, systemName, channelLabels) {
    const t = payload.t;
    const yt = payload.y_true;
    const yp = payload.y_pred;
    const t_train = payload.t_train_max;
    const t_max = payload.t_full_max;

    const traces = [];
    [0, 1].forEach((k) => {
      const ch = channelLabels[k];
      const axSuffix = k === 0 ? "" : "2";
      const yref = "y" + axSuffix;

      traces.push({
        x: t, y: col(yt, k),
        mode: "lines",
        line: { color: COLORS.cyan, width: 2.2 },
        name: "ground truth",
        legendgroup: "truth",
        showlegend: k === 0,
        xaxis: "x", yaxis: yref,
        hovertemplate: "t = %{x:.2f}<br>" + ch + " = %{y:.4f}<extra>truth</extra>",
      });
      traces.push({
        x: t, y: col(yp, k),
        mode: "lines",
        line: { color: COLORS.purple, width: 2.0, dash: "dash" },
        name: "Neural ODE",
        legendgroup: "neuralode",
        showlegend: k === 0,
        xaxis: "x", yaxis: yref,
        hovertemplate: "t = %{x:.2f}<br>" + ch + " = %{y:.4f}<extra>predicted</extra>",
      });
    });

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Trajectory reconstruction</b> · " + systemName +
              "  ·  trained on t ≤ " + t_train.toFixed(1),
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left",
      },
      grid: { rows: 2, columns: 1, pattern: "independent", roworder: "top to bottom" },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "time  t", font: axisStyle.titlefont },
        anchor: "y2",
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: channelLabels[0], font: axisStyle.titlefont },
        domain: [0.55, 1.0],
      }),
      yaxis2: Object.assign({}, axisStyle, {
        title: { text: channelLabels[1], font: axisStyle.titlefont },
        domain: [0.0, 0.45],
        anchor: "x",
      }),
      shapes: [
        shadedExtrap(t_train, t_max, "y domain"),
        shadedExtrap(t_train, t_max, "y2 domain"),
        vlineTrainEnd(t_train, "y domain"),
        vlineTrainEnd(t_train, "y2 domain"),
      ],
      annotations: [
        {
          x: t_train, y: 1.0, xref: "x", yref: "y domain",
          xanchor: "left", yanchor: "top",
          text: "  end of training  ·  t = " + t_train.toFixed(1),
          showarrow: false,
          font: { color: COLORS.amber, size: 11, family: MONO_FAMILY },
          bgcolor: "rgba(13,18,32,0.9)",
          bordercolor: "rgba(251,191,36,0.55)",
          borderwidth: 1, borderpad: 5,
        },
        {
          x: (t_train + t_max) / 2, y: 1.02, xref: "x", yref: "y domain",
          xanchor: "center", yanchor: "bottom",
          text: "extrapolation",
          showarrow: false,
          font: { color: COLORS.amber, size: 10.5, family: MONO_FAMILY, italic: true },
        },
      ],
      hovermode: "x unified",
    });

    Plotly.newPlot(divId, traces, layout, plotlyConfig);
  }

  // ---------- phase plot (orbit + speed contour + quiver-like cones) ----------

  function renderPhase(Plotly, divId, payload, systemName, axisLabels) {
    const yt = payload.y_true;
    const yp = payload.y_pred;
    const vf = payload.vf;

    // Speed magnitude on the grid for a contour heatmap.
    const ny = vf.X.length;
    const nx = vf.X[0].length;
    const xs = vf.X[0];                    // row 0 — x increases along columns
    const ys = vf.Y.map(row => row[0]);    // col 0 — y increases along rows
    const speed = [];
    for (let i = 0; i < ny; i++) {
      const row = [];
      for (let j = 0; j < nx; j++) {
        const u = vf.U[i][j], v = vf.V[i][j];
        row.push(Math.sqrt(u * u + v * v));
      }
      speed.push(row);
    }

    const speedTrace = {
      type: "contour", x: xs, y: ys, z: speed,
      colorscale: "Magma", showscale: true,
      contours: { coloring: "fill", showlines: false },
      opacity: 0.85,
      colorbar: {
        title: { text: "‖f<sub>θ</sub>‖", font: { color: "#e7ecf5" } },
        tickfont: { color: "#9aa3b8", size: 10, family: MONO_FAMILY },
        thickness: 12, len: 0.85, x: 1.02,
        outlinewidth: 0,
      },
      hovertemplate: axisLabels[0] + " = %{x:.2f}<br>" +
                     axisLabels[1] + " = %{y:.2f}<br>‖f<sub>θ</sub>‖ = %{z:.3f}<extra></extra>",
    };

    // Sub-sample the vector field grid for arrow annotations (every step-th cell).
    const step = 3;
    const annotations = [];
    let maxSpeed = 0;
    for (const row of speed) for (const s of row) if (s > maxSpeed) maxSpeed = s;
    const arrowScale = (Math.max(xs[xs.length - 1] - xs[0], ys[ys.length - 1] - ys[0]) / 18) /
                       Math.max(maxSpeed, 1e-6);
    for (let i = 0; i < ny; i += step) {
      for (let j = 0; j < nx; j += step) {
        const x = vf.X[i][j], y = vf.Y[i][j];
        const u = vf.U[i][j], v = vf.V[i][j];
        const mag = Math.sqrt(u * u + v * v);
        if (mag < 1e-6) continue;
        annotations.push({
          x: x + u * arrowScale, y: y + v * arrowScale,
          ax: x, ay: y,
          xref: "x", yref: "y", axref: "x", ayref: "y",
          text: "", showarrow: true,
          arrowhead: 2, arrowsize: 0.9, arrowwidth: 0.9,
          arrowcolor: "rgba(255,255,255,0.55)",
          standoff: 0,
        });
      }
    }

    const orbitTrue = {
      type: "scatter", mode: "lines",
      x: col(yt, 0), y: col(yt, 1),
      line: { color: COLORS.cyan, width: 2.5 },
      name: "ground truth",
      hovertemplate: axisLabels[0] + " = %{x:.3f}<br>" + axisLabels[1] + " = %{y:.3f}<extra>truth</extra>",
    };
    const orbitPred = {
      type: "scatter", mode: "lines",
      x: col(yp, 0), y: col(yp, 1),
      line: { color: COLORS.purple, width: 2.0, dash: "dash" },
      name: "Neural ODE",
      hovertemplate: axisLabels[0] + " = %{x:.3f}<br>" + axisLabels[1] + " = %{y:.3f}<extra>predicted</extra>",
    };
    const startMarker = {
      type: "scatter", mode: "markers",
      x: [yt[0][0]], y: [yt[0][1]],
      marker: { color: COLORS.amber, size: 14, line: { color: "#0d1220", width: 1.8 } },
      name: "initial state · t = 0",
      hovertemplate: "initial state<br>" + axisLabels[0] + " = %{x:.3f}<br>" +
                     axisLabels[1] + " = %{y:.3f}<extra></extra>",
    };
    const endTrue = {
      type: "scatter", mode: "markers",
      x: [yt[yt.length - 1][0]], y: [yt[yt.length - 1][1]],
      marker: { color: COLORS.cyan, size: 11, symbol: "square",
                line: { color: "#0d1220", width: 1.5 } },
      name: "ground-truth final",
    };
    const endPred = {
      type: "scatter", mode: "markers",
      x: [yp[yp.length - 1][0]], y: [yp[yp.length - 1][1]],
      marker: { color: COLORS.purple, size: 11, symbol: "diamond",
                line: { color: "#0d1220", width: 1.5 } },
      name: "Neural ODE final",
    };

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Phase plane</b> · " + systemName + "  ·  orbit on top of the learned vector field",
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left",
      },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: axisLabels[0], font: axisStyle.titlefont },
        range: [xs[0], xs[xs.length - 1]],
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: axisLabels[1], font: axisStyle.titlefont },
        range: [ys[0], ys[ys.length - 1]],
        scaleanchor: undefined,
      }),
      annotations: annotations,
      hovermode: "closest",
      legend: Object.assign({}, baseLayout.legend, {
        y: -0.22,
      }),
    });

    Plotly.newPlot(divId,
      [speedTrace, orbitTrue, orbitPred, startMarker, endTrue, endPred],
      layout, plotlyConfig);
  }

  // ---------- energy plot (pendulum only) ----------

  function renderEnergy(Plotly, divId, payload) {
    const t = payload.t;
    const eT = payload.energy_true;
    const eP = payload.energy_pred;
    const t_train = payload.t_train_max;
    const t_max = payload.t_full_max;

    const driftFinal = Math.abs(eP[eP.length - 1] - eT[eT.length - 1]) /
                       Math.max(Math.abs(eT[eT.length - 1]), 1e-12);
    let trainSum = 0, trainCount = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] > t_train) break;
      trainSum += Math.abs(eP[i] - eT[i]) / Math.max(Math.abs(eT[i]), 1e-12);
      trainCount++;
    }
    const driftTrainMean = trainSum / Math.max(trainCount, 1);

    // Filled gap between predicted and true via two traces with fill='tonexty'.
    const gapBase = {
      x: t, y: eT,
      mode: "lines",
      line: { color: "rgba(0,0,0,0)", width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    };
    const gapFill = {
      x: t, y: eP,
      mode: "lines",
      line: { color: "rgba(0,0,0,0)", width: 0 },
      fill: "tonexty",
      fillcolor: "rgba(244,114,182,0.12)",
      name: "energy gap",
      hoverinfo: "skip",
    };
    const truth = {
      x: t, y: eT,
      mode: "lines",
      line: { color: COLORS.cyan, width: 2.4 },
      name: "ground truth",
      hovertemplate: "t = %{x:.2f}<br>E = %{y:.4f}<extra>truth</extra>",
    };
    const predicted = {
      x: t, y: eP,
      mode: "lines",
      line: { color: COLORS.purple, width: 2.0, dash: "dash" },
      name: "Neural ODE",
      hovertemplate: "t = %{x:.2f}<br>E = %{y:.4f}<extra>predicted</extra>",
    };

    const info = (
      "|ΔE/E|  ·  train mean = " + (driftTrainMean * 100).toFixed(2) + "%<br>" +
      "|ΔE/E|  ·  final t    = " + (driftFinal * 100).toFixed(2) + "%"
    );

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Energy decay</b> · damped pendulum",
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left",
      },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "time  t", font: axisStyle.titlefont },
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: "mechanical energy", font: axisStyle.titlefont },
      }),
      shapes: [
        shadedExtrap(t_train, t_max, "paper"),
        vlineTrainEnd(t_train, "paper"),
      ],
      annotations: [
        {
          x: 0.012, y: 0.05, xref: "paper", yref: "paper",
          xanchor: "left", yanchor: "bottom",
          text: info, showarrow: false, align: "left",
          bgcolor: "rgba(13,18,32,0.9)",
          bordercolor: "rgba(124,92,255,0.55)",
          borderwidth: 1, borderpad: 8,
          font: { color: "#e7ecf5", size: 11, family: MONO_FAMILY },
        },
      ],
      hovermode: "x unified",
    });

    Plotly.newPlot(divId, [gapBase, gapFill, truth, predicted], layout, plotlyConfig);
  }

  // ---------- orchestration ----------

  function ensurePlotly() {
    return new Promise((resolve, reject) => {
      if (window.Plotly) return resolve(window.Plotly);
      const deadline = Date.now() + 8000;
      const poll = () => {
        if (window.Plotly) resolve(window.Plotly);
        else if (Date.now() > deadline) reject(new Error("Plotly failed to load"));
        else setTimeout(poll, 80);
      };
      poll();
    });
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<div class="chart-loading" style="color:#f472b6;">' + msg + "</div>";
  }

  ensurePlotly()
    .then((Plotly) =>
      fetch(DATA_URL)
        .then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then((data) => {
          const pendulum = Object.assign({}, data.pendulum,
            { metrics: data.metrics.damped_pendulum });
          const lotka = Object.assign({}, data.lotka,
            { metrics: data.metrics.lotka_volterra });

          renderLoss(Plotly, "chart-pendulum-loss", pendulum, "damped pendulum");
          renderTrajectory(Plotly, "chart-pendulum-traj", pendulum,
                           "damped pendulum", ["θ  (rad)", "θ̇  (rad/s)"]);
          renderPhase(Plotly, "chart-pendulum-phase", pendulum,
                      "damped pendulum", ["θ", "θ̇"]);
          renderEnergy(Plotly, "chart-pendulum-energy", pendulum);

          renderLoss(Plotly, "chart-lotka-loss", lotka, "Lotka-Volterra");
          renderTrajectory(Plotly, "chart-lotka-traj", lotka,
                           "Lotka-Volterra", ["prey  x", "predator  z"]);
          renderPhase(Plotly, "chart-lotka-phase", lotka,
                      "Lotka-Volterra", ["prey  x", "predator  z"]);
        })
    )
    .catch((err) => {
      console.error("Neural ODE charts:", err);
      [
        "chart-pendulum-loss", "chart-pendulum-traj",
        "chart-pendulum-phase", "chart-pendulum-energy",
        "chart-lotka-loss", "chart-lotka-traj", "chart-lotka-phase",
      ].forEach((id) => showError(id, "Could not load chart: " + err.message));
    });
})();
