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
      format: "png", filename: "camilo-rozo-ising", scale: 2,
    },
  };

  // ---------- math helpers ----------

  function linspace(a, b, n) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = a + (b - a) * i / (n - 1);
    return out;
  }

  // Solve A · x = b via Gaussian elimination with partial pivoting.
  function solveLinear(A, b) {
    const n = A.length;
    const M = A.map((row, i) => row.concat([b[i]]));
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];
      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = M[i][n];
      for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
      x[i] = sum / M[i][i];
    }
    return x;
  }

  // Weighted polynomial regression. Returns a fit object whose domain is
  // normalized to [-1, 1] for numerical conditioning.
  function polyfit(x, y, degree, weights) {
    const n = x.length;
    const m = degree + 1;
    const w = weights || new Array(n).fill(1);
    const xMin = Math.min.apply(null, x);
    const xMax = Math.max.apply(null, x);
    const span = xMax - xMin;
    const xn = x.map(v => 2 * (v - xMin) / span - 1);

    const ATA = Array.from({ length: m }, () => new Array(m).fill(0));
    const ATy = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      const powers = new Array(m);
      let p = 1;
      for (let j = 0; j < m; j++) { powers[j] = p; p *= xn[i]; }
      const wi = w[i];
      for (let j = 0; j < m; j++) {
        ATy[j] += wi * powers[j] * y[i];
        for (let k = 0; k < m; k++) ATA[j][k] += wi * powers[j] * powers[k];
      }
    }
    return { coef: solveLinear(ATA, ATy), xMin: xMin, xMax: xMax };
  }

  function polyeval(fit, x) {
    const span = fit.xMax - fit.xMin;
    const xn = 2 * (x - fit.xMin) / span - 1;
    const c = fit.coef;
    let y = 0, p = 1;
    for (let i = 0; i < c.length; i++) { y += c[i] * p; p *= xn; }
    return y;
  }

  function kde(samples, n_grid) {
    n_grid = n_grid || 220;
    let min = Infinity, max = -Infinity;
    for (const s of samples) { if (s < min) min = s; if (s > max) max = s; }
    const span = max - min;
    const pad = span * 0.12 || 0.05;
    const grid = linspace(min - pad, max + pad, n_grid);

    // Silverman's rule of thumb bandwidth
    const n = samples.length;
    let mean = 0;
    for (const s of samples) mean += s; mean /= n;
    let variance = 0;
    for (const s of samples) variance += (s - mean) ** 2; variance /= n;
    const sigma = Math.sqrt(Math.max(variance, 1e-12));
    const h = Math.max(1.06 * sigma * Math.pow(n, -0.2), 1e-6);

    const density = new Array(n_grid);
    const norm = 1 / (n * h * Math.sqrt(2 * Math.PI));
    for (let i = 0; i < n_grid; i++) {
      let sum = 0;
      const x = grid[i];
      for (let j = 0; j < n; j++) {
        const u = (x - samples[j]) / h;
        sum += Math.exp(-0.5 * u * u);
      }
      density[i] = sum * norm;
    }
    return { x: grid, y: density };
  }

  // ---------- plot 1: magnetization ----------

  function renderMagnetization(Plotly, data) {
    const m = data.magnetization;
    const tc_onsager = data.exact.Tc;
    const fit = data.fit;

    // Empirical model fitted to THIS simulation (weighted nonlinear
    // least squares via scipy.optimize.curve_fit):
    //     M(T) = A/2 · [1 − tanh((T − Tc)/w)] + c
    // Parameters (A, Tc, w, c) come from the portfolio JSON.
    function M_fitted(T) {
      return fit.A * 0.5 * (1 - Math.tanh((T - fit.Tc) / fit.w)) + fit.c;
    }

    const T_fine = linspace(1.5, 3.5, 400);
    const M_curve = T_fine.map(M_fitted);

    const fitTrace = {
      x: T_fine, y: M_curve,
      mode: "lines",
      name: "fit to simulated data",
      line: { color: COLORS.purple, width: 3, shape: "spline", smoothing: 0.1 },
      fill: "tozeroy",
      fillcolor: "rgba(124,92,255,0.08)",
      hovertemplate: "T = %{x:.3f}<br>M<sub>fit</sub>(T) = %{y:.4f}<extra>fit</extra>",
    };

    const dataTrace = {
      x: m.T, y: m.M_mean, customdata: m.M_std,
      error_y: {
        type: "data", array: m.M_std,
        color: "rgba(244,114,182,0.55)", thickness: 1.2, width: 4,
      },
      mode: "markers",
      name: "simulated ⟨|M|⟩",
      marker: {
        size: 8, color: COLORS.pink,
        line: { color: "rgba(255,255,255,0.25)", width: 1 },
        symbol: "circle",
      },
      hovertemplate:
        "T = %{x:.3f}<br>⟨|M|⟩ = %{y:.4f} ± %{customdata:.4f}<extra>simulated</extra>",
    };

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Phase transition</b> · magnetization vs. temperature",
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left", y: 0.98, yanchor: "top",
      },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "Temperature T (units of J/k<sub>B</sub>)", font: axisStyle.titlefont },
        range: [1.45, 3.55],
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: "Magnetization ⟨|M|⟩", font: axisStyle.titlefont },
        range: [-0.05, 1.08],
      }),
      shapes: [
        {
          type: "line", xref: "x", yref: "paper",
          x0: tc_onsager, x1: tc_onsager, y0: 0, y1: 1,
          line: { color: COLORS.amber, dash: "dash", width: 2 },
        },
      ],
      annotations: [
        {
          x: tc_onsager, y: 0.96, xref: "x", yref: "paper",
          xanchor: "right", yanchor: "top",
          text: "T<sub>c</sub> ≈ " + tc_onsager.toFixed(4) + "  ",
          showarrow: false,
          font: { color: COLORS.amber, size: 11, family: MONO_FAMILY },
        },
        {
          x: 1.55, y: 0.35, xref: "x", yref: "y",
          xanchor: "left", yanchor: "top", align: "left",
          text:
            "<b>M(T) = A/2 · [1 − tanh((T − T<sub>c</sub>)/w)] + c</b><br>" +
            "<span style='opacity:0.85'>" +
            "A = " + fit.A.toFixed(3) + " ± " + fit.A_err.toFixed(3) + "<br>" +
            "T<sub>c</sub> = " + fit.Tc.toFixed(3) + " ± " + fit.Tc_err.toFixed(3) + "<br>" +
            "w = " + fit.w.toFixed(3) + " ± " + fit.w_err.toFixed(3) + "<br>" +
            "c = " + fit.c.toFixed(3) + " ± " + fit.c_err.toFixed(3) + "<br>" +
            "χ²/dof = " + fit.chi2_reduced +
            "</span>",
          showarrow: false,
          bgcolor: "rgba(13,18,32,0.82)",
          bordercolor: "rgba(124,92,255,0.55)",
          borderwidth: 1,
          borderpad: 12,
          font: { color: "#e7ecf5", size: 11, family: MONO_FAMILY },
        },
      ],
      hovermode: "closest",
      showlegend: true,
    });

    Plotly.newPlot("chart-magnetization", [fitTrace, dataTrace], layout, plotlyConfig);
  }

  // ---------- plot 2: posteriors ----------

  function renderPosteriors(Plotly, data) {
    const post = data.posterior;
    const summary = data.summary;

    const flatTc = post.Tc.reduce((a, b) => a.concat(b), []);
    const flatBeta = post.beta.reduce((a, b) => a.concat(b), []);

    const kdeTc = kde(flatTc);
    const kdeBeta = kde(flatBeta);

    const tcLine = {
      x: kdeTc.x, y: kdeTc.y,
      type: "scatter", mode: "lines",
      name: "P(Tc | data)",
      line: { color: COLORS.purple, width: 3, shape: "spline", smoothing: 0.85 },
      fill: "tozeroy",
      fillcolor: "rgba(124,92,255,0.18)",
      xaxis: "x", yaxis: "y",
      hovertemplate: "Tc = %{x:.3f}<br>density = %{y:.2f}<extra></extra>",
    };

    const betaLine = {
      x: kdeBeta.x, y: kdeBeta.y,
      type: "scatter", mode: "lines",
      name: "P(β | data)",
      line: { color: COLORS.cyan, width: 3, shape: "spline", smoothing: 0.85 },
      fill: "tozeroy",
      fillcolor: "rgba(34,211,238,0.16)",
      xaxis: "x2", yaxis: "y2",
      hovertemplate: "β = %{x:.3f}<br>density = %{y:.2f}<extra></extra>",
    };

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Posterior distributions</b> · Tc and β",
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left",
      },
      grid: { rows: 1, columns: 2, pattern: "independent" },
      xaxis: Object.assign({}, axisStyle, {
        title: { text: "T<sub>c</sub>", font: axisStyle.titlefont },
        domain: [0, 0.46],
      }),
      yaxis: Object.assign({}, axisStyle, {
        title: { text: "density", font: axisStyle.titlefont },
      }),
      xaxis2: Object.assign({}, axisStyle, {
        title: { text: "β", font: axisStyle.titlefont },
        domain: [0.54, 1.0],
        anchor: "y2",
      }),
      yaxis2: Object.assign({}, axisStyle, {
        title: { text: "density", font: axisStyle.titlefont },
        anchor: "x2",
      }),
      shapes: [
        // Tc HDI band
        { type: "rect", xref: "x", yref: "paper",
          x0: summary.Tc.hdi[0], x1: summary.Tc.hdi[1], y0: 0, y1: 1,
          fillcolor: "rgba(124,92,255,0.10)", line: { width: 0 } },
        // Tc exact (Onsager)
        { type: "line", xref: "x", yref: "paper",
          x0: data.exact.Tc, x1: data.exact.Tc, y0: 0, y1: 1,
          line: { color: COLORS.amber, dash: "dash", width: 2 } },
        // Tc posterior mean
        { type: "line", xref: "x", yref: "paper",
          x0: summary.Tc.mean, x1: summary.Tc.mean, y0: 0, y1: 1,
          line: { color: COLORS.pink, width: 2 } },
        // β HDI band
        { type: "rect", xref: "x2", yref: "paper",
          x0: summary.beta.hdi[0], x1: summary.beta.hdi[1], y0: 0, y1: 1,
          fillcolor: "rgba(34,211,238,0.10)", line: { width: 0 } },
        // β exact
        { type: "line", xref: "x2", yref: "paper",
          x0: data.exact.beta, x1: data.exact.beta, y0: 0, y1: 1,
          line: { color: COLORS.amber, dash: "dash", width: 2 } },
        // β posterior mean
        { type: "line", xref: "x2", yref: "paper",
          x0: summary.beta.mean, x1: summary.beta.mean, y0: 0, y1: 1,
          line: { color: COLORS.pink, width: 2 } },
      ],
      annotations: [
        {
          x: data.exact.Tc, y: 0.96, xref: "x", yref: "paper",
          xanchor: "right", text: "exact " + data.exact.Tc.toFixed(4) + "  ",
          showarrow: false,
          font: { color: COLORS.amber, size: 11, family: MONO_FAMILY },
        },
        {
          x: summary.Tc.mean, y: 0.88, xref: "x", yref: "paper",
          xanchor: "left", text: "  mean " + summary.Tc.mean,
          showarrow: false,
          font: { color: COLORS.pink, size: 11, family: MONO_FAMILY },
        },
        {
          x: data.exact.beta, y: 0.96, xref: "x2", yref: "paper",
          xanchor: "left", text: "  exact " + data.exact.beta,
          showarrow: false,
          font: { color: COLORS.amber, size: 11, family: MONO_FAMILY },
        },
        {
          x: summary.beta.mean, y: 0.88, xref: "x2", yref: "paper",
          xanchor: "right", text: "mean " + summary.beta.mean + "  ",
          showarrow: false,
          font: { color: COLORS.pink, size: 11, family: MONO_FAMILY },
        },
      ],
      showlegend: false,
      hovermode: "x",
    });

    Plotly.newPlot("chart-posteriors", [tcLine, betaLine], layout, plotlyConfig);
  }

  // ---------- plot 3: trace ----------

  function renderTrace(Plotly, data) {
    const post = data.posterior;
    const chainColors = [COLORS.purple, COLORS.cyan, COLORS.pink, COLORS.amber];
    const params = [
      { key: "Tc",    label: "T<sub>c</sub>" },
      { key: "beta",  label: "β" },
      { key: "sigma", label: "σ" },
    ];

    const traces = [];
    params.forEach((p, pi) => {
      const chains = post[p.key];
      const axSuffix = pi === 0 ? "" : String(pi + 1);
      chains.forEach((chain, ci) => {
        traces.push({
          x: chain.map((_, i) => i),
          y: chain,
          type: "scatter",
          mode: "lines",
          name: "chain " + (ci + 1),
          legendgroup: "chain" + (ci + 1),
          showlegend: pi === 0,
          line: { color: chainColors[ci], width: 0.8 },
          opacity: 0.68,
          xaxis: "x" + axSuffix,
          yaxis: "y" + axSuffix,
          hovertemplate:
            "iter %{x}<br>" + p.key + " = %{y:.4f}<extra>chain " + (ci + 1) + "</extra>",
        });
      });
    });

    const mkAxis = (extra) => Object.assign({}, axisStyle, extra);

    const layout = Object.assign({}, baseLayout, {
      title: {
        text: "<b>Trace plots</b> · MCMC chains over iterations",
        font: { size: 15, color: "#e7ecf5", family: FONT_FAMILY },
        x: 0.02, xanchor: "left",
      },
      grid: { rows: 3, columns: 1, pattern: "independent", roworder: "top to bottom" },
      xaxis:  mkAxis({}),
      yaxis:  mkAxis({ title: { text: params[0].label, font: axisStyle.titlefont } }),
      xaxis2: mkAxis({}),
      yaxis2: mkAxis({ title: { text: params[1].label, font: axisStyle.titlefont } }),
      xaxis3: mkAxis({ title: { text: "iteration", font: axisStyle.titlefont } }),
      yaxis3: mkAxis({ title: { text: params[2].label, font: axisStyle.titlefont } }),
      showlegend: true,
      hovermode: "closest",
    });

    Plotly.newPlot("chart-trace", traces, layout, plotlyConfig);
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
          renderMagnetization(Plotly, data);
          renderPosteriors(Plotly, data);
          renderTrace(Plotly, data);
        })
    )
    .catch((err) => {
      console.error("Ising charts:", err);
      ["chart-magnetization", "chart-posteriors", "chart-trace"].forEach((id) =>
        showError(id, "Could not load chart: " + err.message)
      );
    });
})();
