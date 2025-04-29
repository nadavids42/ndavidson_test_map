import { loadData } from './load_data.js';
import { METRICS, buildLookupByCode } from './metrics.js';
import { renderMap } from './map_render.js';
import { updateScatterplot } from './scatterplot_render.js';
import { setupControls } from './ui_controls.js';
import { renderLineChart } from "./linechart_render.js";


loadData().then(([districts, allData, massDistricts]) => {
  const width = 800;
  const height = 600;
  const scatterWidth = 480;
  const scatterHeight = 480;
  const defaultYear = 2021;

  // Main Map SVG
  const svg = d3.select("#map").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("responsive-svg", true);

  // Scatterplot SVG
  const scatterSvg = d3.select("#scatterplot").append("svg")
    .attr("viewBox", `0 0 ${scatterWidth} ${scatterHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("responsive-svg", true);

  // Selectors & Labels
  const metricSelect = d3.select("#metricSelect");
  const xMetricSelect = d3.select("#xMetricSelect");
  const yMetricSelect = d3.select("#yMetricSelect");
  const yearSlider = d3.select("#yearSlider");
  const yearDropdown = d3.select("#yearDropdown");
  const yearValueLabel = d3.select("#yearValue");
  const subtitle = d3.select("#subtitle");

  // Years & Extents
  const allYears = Array.from(new Set(allData.map(d => +d["Year"]))).sort();
  const minYear = d3.min(allYears);
  const maxYear = d3.max(allYears);

  // Populate year dropdown for mobile
  yearDropdown.selectAll("option")
    .data(allYears)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Set both controls and label to default year
  yearSlider.property("value", defaultYear);
  yearDropdown.property("value", defaultYear);
  yearValueLabel.text(defaultYear);

  // Geo projection
  const projection = d3.geoMercator().fitSize([width, height], districts);
  const path = d3.geoPath().projection(projection);

  // --- Add Massachusetts Districts GeoJSON Layer (outline, below main layer) ---
  svg.append("g").attr("class", "ma-districts")
    .selectAll("path")
    .data(massDistricts.features)
    .enter().append("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1.5)
    .attr("pointer-events", "none");

  svg.append("g").attr("class", "districts")
    .selectAll("path")
    .data(districts.features)
    .enter().append("path")
    .attr("d", path)
    .attr("stroke", "#333");

  // Legend setup
  const defs = svg.append("defs");
  const legendGradient = defs.append("linearGradient").attr("id", "legend-gradient");
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 300 - 40}, ${height - 40})`);
  legend.append("rect")
    .attr("width", 300)
    .attr("height", 10)
    .style("fill", "url(#legend-gradient)")
    .style("stroke", "#aaa");
  const legendTitle = legend.append("text")
    .attr("x", 0)
    .attr("y", -5)
    .style("fill", "#eee");
  const legendLabels = legend.selectAll("text.labels")
    .data([0, 0, 0])
    .enter().append("text")
    .attr("class", "labels")
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("fill", "#eee");

  // --- Legend updater ---
  function updateLegend(domain, metricObj) {
    if (!metricObj || !metricObj.legend) {
      console.error("updateLegend: metricObj missing or has no legend property", metricObj);
      return;
    }
    legendGradient.selectAll("stop").remove();

    // PURPLE legend for demo metrics
    if (metricObj.legend === "demo") {
      let demoDomain = domain;
      legendGradient.selectAll("stop")
        .data(d3.range(demoDomain[0], demoDomain[1] + 1))
        .enter().append("stop")
        .attr("offset", d => `${((d - demoDomain[0]) / (demoDomain[1] - demoDomain[0])) * 100}%`)
        .attr("stop-color", d => d3.interpolatePuRd((d - demoDomain[0]) / (demoDomain[1] - demoDomain[0])));
      legendTitle.text(metricObj.label);
      legendLabels.data([demoDomain[0], Math.round((demoDomain[0] + demoDomain[1]) / 2), demoDomain[1]])
        .attr("x", (d, i) => i === 0 ? 0 : (i === 1 ? 150 : 300))
        .text(d => `${d}%`);
    } else if (metricObj.legend === "percent") {
      let gradDomain;
      if (metricObj.key === "grad") {
        gradDomain = [50, 100];
      } else {
        gradDomain = domain;
      }
      legendGradient.selectAll("stop")
        .data(d3.range(gradDomain[0], gradDomain[1] + 1))
        .enter().append("stop")
        .attr("offset", d => `${((d - gradDomain[0]) / (gradDomain[1] - gradDomain[0])) * 100}%`)
        .attr("stop-color", d => d3.interpolateBlues((d - gradDomain[0]) / (gradDomain[1] - gradDomain[0])));
      legendTitle.text(metricObj.label);
      legendLabels.data([gradDomain[0], Math.round((gradDomain[0] + gradDomain[1]) / 2), gradDomain[1]])
        .attr("x", (d, i) => i === 0 ? 0 : (i === 1 ? 150 : 300))
        .text(d => `${d}%`);
    } else if (metricObj.legend === "dollars") {
      const [minS, maxS] = domain;
      legendGradient.selectAll("stop")
        .data(d3.range(minS, maxS + 1, (maxS - minS) / 100))
        .enter().append("stop")
        .attr("offset", s => `${((s - minS) / (maxS - minS)) * 100}%`)
        .attr("stop-color", s => d3.interpolateGreens((s - minS) / (maxS - minS)));
      legendTitle.text(metricObj.label);
      legendLabels.data([minS, Math.round((minS + maxS) / 2), maxS])
        .attr("x", (d, i) => i === 0 ? 0 : (i === 1 ? 150 : 300))
        .text(d => "$" + d.toLocaleString(undefined, {maximumFractionDigits: 0}));
    } else {
      const [minS, maxS] = domain;
      legendGradient.selectAll("stop")
        .data(d3.range(minS, maxS + 1, (maxS - minS) / 100))
        .enter().append("stop")
        .attr("offset", s => `${((s - minS) / (maxS - minS)) * 100}%`)
        .attr("stop-color", s => d3.interpolateOranges((s - minS) / (maxS - minS)));
      legendTitle.text(metricObj.label);
      legendLabels.data([minS, Math.round((minS + maxS) / 2), maxS])
        .attr("x", (d, i) => i === 0 ? 0 : (i === 1 ? 150 : 300))
        .text(d => d3.format(".0f")(d));
    }
  }

  // --- Set up controls ---
  setupControls(metricSelect, yearSlider, rerender, minYear, maxYear, defaultYear, METRICS, "grad");
  setupControls(xMetricSelect, null, rerender, null, null, null, METRICS, "grad");
  setupControls(yMetricSelect, null, rerender, null, null, null, METRICS, "salary");

  renderLineChart(allData);

  // Helper: always get selected year from whichever control is visible
  function getSelectedYear() {
    // Use dropdown value on mobile (< 768px), else slider
    return window.innerWidth < 768
      ? +yearDropdown.node().value
      : +yearSlider.node().value;
  }

  // Sync both controls (and label) when year changes
  function setYear(year) {
    yearSlider.property("value", year);
    yearDropdown.property("value", year);
    yearValueLabel.text(year);
    rerender();
  }

  // Add event listeners to both controls
  yearSlider.on("input", function() {
    setYear(this.value);
  });
  yearDropdown.on("change", function() {
    setYear(this.value);
  });

  // Optionally, sync both controls if screen resizes across mobile/desktop boundary
  window.addEventListener("resize", () => {
    const curYear = getSelectedYear();
    yearSlider.property("value", curYear);
    yearDropdown.property("value", curYear);
    yearValueLabel.text(curYear);
  });

  // --- Main rendering function ---
  function rerender() {
    const selectedYear = getSelectedYear();
    const selectedMetric = metricSelect.node().value;

    // For scatterplot axes
    const xMetricKey = xMetricSelect.node().value || METRICS[0].key;
    const yMetricKey = yMetricSelect.node().value || METRICS[1].key;
    const metricObj = METRICS.find(m => m.key === selectedMetric);
    const xMetricObj = METRICS.find(m => m.key === xMetricKey);
    const yMetricObj = METRICS.find(m => m.key === yMetricKey);

    yearValueLabel.text(selectedYear);
    subtitle.text(`${metricObj.label}: ${selectedYear}`);

    const metricByCode = buildLookupByCode(allData, metricObj.col, selectedYear);
    const xByCode = buildLookupByCode(allData, xMetricObj.col, selectedYear);
    const yByCode = buildLookupByCode(allData, yMetricObj.col, selectedYear);

    // Color scale and domain for map
    let domain = d3.extent(Object.values(metricByCode).filter(v => v != null));
    let color;
    if (metricObj.legend === "demo") {
      const maxVal = Math.max(0, ...Object.values(metricByCode).filter(v => v != null));
      domain = [0, Math.ceil(maxVal / 10) * 10];
      color = d3.scaleQuantize().domain(domain).range(d3.schemePuRd[7]);
    } else if (metricObj.legend === "percent") {
      if (metricObj.key === "grad") {
        domain = [50, 100];
      } else {
        const maxVal = Math.max(0, ...Object.values(metricByCode).filter(v => v != null));
        domain = [0, Math.ceil(maxVal / 10) * 10];
      }
      color = d3.scaleQuantize().domain(domain).range(d3.schemeBlues[7]);
    } else if (metricObj.legend === "dollars") {
      domain = [
        Math.floor(domain[0] / 1000) * 1000,
        Math.ceil(domain[1] / 1000) * 1000
      ];
      color = d3.scaleQuantize().domain(domain).range(d3.schemeGreens[7]);
    } else {
      color = d3.scaleQuantize().domain(domain).range(d3.schemeOranges[7]);
    }

    updateLegend(domain, metricObj);

    renderMap(
      svg,
      districts,
      path,
      color,
      code => metricByCode[code],
      domain,
      updateLegend,
      metricByCode,
      xByCode,
      yByCode,
      metricObj,
      xMetricObj,
      yMetricObj,
      selectedYear
    );

    updateScatterplot(
      scatterSvg,
      xByCode,
      yByCode,
      xMetricObj,
      yMetricObj,
      selectedYear,
      districts
    );
  }

  // --- Initial render ---
  rerender();
  document.getElementById('loading-overlay').style.display = 'none'; // <-- add this last
});
