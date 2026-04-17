// Interactive Plotly charts for the Ising Bayesian project.
// Data source: ../data/01-ising.json

(function () {
  "use strict";

  const DATA_URL = "../assets/data/01-ising.json";

  const COLORS = {
    purple: "#7c5cff",
    cyan:   "#22d3ee",
    pink:   "#f472b6",
    amber:  "#fbbf24",
    gray:   "rgba(154,163,184,0.55)",
  };

  const baseLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor:  "rgba(0,0,0,0)",
    font: {
      color: "#e7ecf5",
      family: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      size: 12,
    },
    margin: { t: 52, r: 28, b: 52, l: 62 },
    hoverlabel: {
      bgcolor: "rgba(13,18,32,0.96)",
      bordercolor: "rgba(124,92,255,0.55)",
      font: {
        color: "#e7ecf5",
        family: "ui-monospace, JetBrains Mono, Consolas, monospace",
        size: 12,
      },
    },
    legend: {
      bgcolor: "rgba(255,255,255,0.04)",
      bordercolor: "rgba(255,255,255,0.08)",
      borderwidth: 1,
      font: { color: "#e7ecf5", size: 12 },
      orientation: "h",
      y: -0.14,
      x: 0.5,
      xanchor: "center",
    },
  };

  const axisStyle = {
    gridcolor: "rgba(255,255,255,0.06)",
    zerolinecolor: "rgba(255,255,255,0.12)",
    linecolor: "rgba(255,255,255,0.2)",
    tickfont: { color: "#9aa3b8", size: 11 },
    titlefont: { color: "#e7ecf5", size: 13 },
  };

  const plotlyConfig = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      "sendDataToCloud", "lasso2d", "select2d",
      "autoScale2d", "hoverClosestCartesian", "hoverCompareCartesian",
    ],
    toImageButtonOptions: {
      format: "png",
      filename: "camilo-rozo-ising",
      scale: 2,
    },
  };

  function ensurePlotly() {
    return new Promise((resolve, reject) => {
      if (window.Plotly) return resolve(window.Plotly);
      const deadline = Date.now() + 6000;
      const poll = () => {
        if (window.Plotly) resolve(window.Plotly);
        else if (Date.now() > deadline) reject(new Error("Plotly failed to load"));
        else setTimeout(poll, 80);
      };
      poll();
    });
  }

  function renderMagnetization(Plotly, data) {
    const m = data.magnetization;
    const tc = data.exact.Tc;

    const curve = {
      x: m.T,
      y: m.M_mean,
      customdata: m.M_std,
      error_y: {
        type: "data",
        array: m.M_std,
        color: COLORS.gray,
        thickness: 1.4,
        width: 5,
      },
      mode: "markers+lines",
      name: "⟨|M|⟩",
      line: { color: COLORS.purple, width: 2.5, shape: "spline" },
      marker: {
        size: 9,
        color: COLORS.purple,
        line: { color: "rgba(255,255,255,0.25)", width: 1 },
      },
      hovertemplate:
        "<b>T = %{x:.3f}</b><br>⟨|M|⟩ = %{y:.4f} ± %{customdata:.4f}<extra></extra>",
    };

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Phase transition</b> · magnetization vs. temperature",
        font: { size: 15, color: "#e7ecf5" },
        x: 0.02, xanchor: "left",
      },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "Temperature T (units of J/k<sub>B</sub>)", font: axisStyle.titlefont },
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: "Magnetization ⟨|M|⟩", font: axisStyle.titlefont },
        range: [-0.05, 1.08],
      }),
      shapes: [
        {
          type: "line", xref: "x", yref: "paper",
          x0: tc, x1: tc, y0: 0, y1: 1,
          line: { color: COLORS.pink, dash: "dash", width: 2 },
        },
      ],
      annotations: [
        {
          x: tc, y: 0.96, xref: "x", yref: "paper",
          xanchor: "left", yanchor: "top",
          text: "  T<sub>c</sub><sup>Onsager</sup> ≈ " + tc.toFixed(4),
          showarrow: false,
          font: { color: COLORS.pink, size: 12, family: "ui-monospace, monospace" },
        },
      ],
      showlegend: false,
    });

    Plotly.newPlot("chart-magnetization", [curve], layout, plotlyConfig);
  }

  function renderPosteriors(Plotly, data) {
    const post = data.posterior;
    const summary = data.summary;

    // Flatten chains
    const flatTc = post.Tc.reduce((a, b) => a.concat(b), []);
    const flatBeta = post.beta.reduce((a, b) => a.concat(b), []);

    const histTc = {
      x: flatTc,
      type: "histogram",
      nbinsx: 60,
      histnorm: "probability density",
      name: "P(Tc | data)",
      marker: {
        color: "rgba(124,92,255,0.7)",
        line: { color: "rgba(124,92,255,1)", width: 1 },
      },
      xaxis: "x", yaxis: "y",
      hovertemplate: "<b>Tc = %{x:.3f}</b><br>density = %{y:.2f}<extra></extra>",
    };

    const histBeta = {
      x: flatBeta,
      type: "histogram",
      nbinsx: 60,
      histnorm: "probability density",
      name: "P(β | data)",
      marker: {
        color: "rgba(34,211,238,0.7)",
        line: { color: "rgba(34,211,238,1)", width: 1 },
      },
      xaxis: "x2", yaxis: "y2",
      hovertemplate: "<b>β = %{x:.3f}</b><br>density = %{y:.2f}<extra></extra>",
    };

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Posterior distributions</b> · Tc and β",
        font: { size: 15, color: "#e7ecf5" },
        x: 0.02, xanchor: "left",
      },
      grid: { rows: 1, columns: 2, pattern: "independent" },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "T<sub>c</sub>", font: axisStyle.titlefont },
        domain: [0, 0.46],
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: "Density", font: axisStyle.titlefont },
      }),
      xaxis2: Object.assign({}, axisStyle, {
        title: { text: "β", font: axisStyle.titlefont },
        domain: [0.54, 1.0],
        anchor: "y2",
      }),
      yaxis2: Object.assign({}, axisStyle, {
        title: { text: "Density", font: axisStyle.titlefont },
        anchor: "x2",
      }),
      shapes: [
        // Tc HDI
        {
          type: "rect", xref: "x", yref: "paper",
          x0: summary.Tc.hdi[0], x1: summary.Tc.hdi[1], y0: 0, y1: 1,
          fillcolor: "rgba(124,92,255,0.14)", line: { width: 0 },
        },
        // Tc exact
        {
          type: "line", xref: "x", yref: "paper",
          x0: data.exact.Tc, x1: data.exact.Tc, y0: 0, y1: 1,
          line: { color: COLORS.pink, dash: "dash", width: 2 },
        },
        // Tc posterior mean
        {
          type: "line", xref: "x", yref: "paper",
          x0: summary.Tc.mean, x1: summary.Tc.mean, y0: 0, y1: 1,
          line: { color: COLORS.amber, width: 2 },
        },
        // β HDI
        {
          type: "rect", xref: "x2", yref: "paper",
          x0: summary.beta.hdi[0], x1: summary.beta.hdi[1], y0: 0, y1: 1,
          fillcolor: "rgba(34,211,238,0.14)", line: { width: 0 },
        },
        // β exact
        {
          type: "line", xref: "x2", yref: "paper",
          x0: data.exact.beta, x1: data.exact.beta, y0: 0, y1: 1,
          line: { color: COLORS.pink, dash: "dash", width: 2 },
        },
        // β posterior mean
        {
          type: "line", xref: "x2", yref: "paper",
          x0: summary.beta.mean, x1: summary.beta.mean, y0: 0, y1: 1,
          line: { color: COLORS.amber, width: 2 },
        },
      ],
      annotations: [
        {
          x: data.exact.Tc, y: 0.96, xref: "x", yref: "paper",
          xanchor: "left", text: "  exact " + data.exact.Tc.toFixed(4),
          showarrow: false,
          font: { color: COLORS.pink, size: 11, family: "ui-monospace, monospace" },
        },
        {
          x: summary.Tc.mean, y: 0.88, xref: "x", yref: "paper",
          xanchor: "left", text: "  mean " + summary.Tc.mean,
          showarrow: false,
          font: { color: COLORS.amber, size: 11, family: "ui-monospace, monospace" },
        },
        {
          x: data.exact.beta, y: 0.96, xref: "x2", yref: "paper",
          xanchor: "left", text: "  exact " + data.exact.beta,
          showarrow: false,
          font: { color: COLORS.pink, size: 11, family: "ui-monospace, monospace" },
        },
        {
          x: summary.beta.mean, y: 0.88, xref: "x2", yref: "paper",
          xanchor: "left", text: "  mean " + summary.beta.mean,
          showarrow: false,
          font: { color: COLORS.amber, size: 11, family: "ui-monospace, monospace" },
        },
      ],
      showlegend: false,
      bargap: 0.02,
    });

    Plotly.newPlot("chart-posteriors", [histTc, histBeta], layout, plotlyConfig);
  }

  function renderTrace(Plotly, data) {
    const post = data.posterior;
    const chainColors = [COLORS.purple, COLORS.cyan, COLORS.pink, COLORS.amber];
    const params = [
      { key: "Tc",    label: "T<sub>c</sub>", axis: "" },
      { key: "beta",  label: "β",             axis: "2" },
      { key: "sigma", label: "σ",             axis: "3" },
    ];

    const traces = [];
    params.forEach((p, pi) => {
      const chains = post[p.key];
      chains.forEach((chain, ci) => {
        traces.push({
          x: chain.map((_, i) => i),
          y: chain,
          type: "scatter",
          mode: "lines",
          name: "chain " + (ci + 1),
          legendgroup: "chain" + (ci + 1),
          showlegend: pi === 0,
          line: { color: chainColors[ci], width: 0.9 },
          opacity: 0.7,
          xaxis: "x" + p.axis,
          yaxis: "y" + p.axis,
          hovertemplate:
            "iter %{x}<br>" + p.key + " = %{y:.4f}<extra>chain " + (ci + 1) + "</extra>",
        });
      });
    });

    const mkAxis = (extra) => Object.assign({}, axisStyle, extra);

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Trace plots</b> · MCMC chains over iterations",
        font: { size: 15, color: "#e7ecf5" },
        x: 0.02, xanchor: "left",
      },
      grid: { rows: 3, columns: 1, pattern: "independent", roworder: "top to bottom" },
      xaxis:  mkAxis({}),
      yaxis:  mkAxis({ title: { text: params[0].label, font: axisStyle.titlefont } }),
      xaxis2: mkAxis({}),
      yaxis2: mkAxis({ title: { text: params[1].label, font: axisStyle.titlefont } }),
      xaxis3: mkAxis({ title: { text: "Iteration", font: axisStyle.titlefont } }),
      yaxis3: mkAxis({ title: { text: params[2].label, font: axisStyle.titlefont } }),
      showlegend: true,
    });

    Plotly.newPlot("chart-trace", traces, layout, plotlyConfig);
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
          renderMagnetization(Plotly, data);
          renderPosteriors(Plotly, data);
          renderTrace(Plotly, data);
        })
    )
    .catch((err) => {
      console.error("Ising charts:", err);
      ["chart-magnetization", "chart-posteriors", "chart-trace"].forEach((id) =>
        showError(id, "Couldn't load chart: " + err.message)
      );
    });
})();
