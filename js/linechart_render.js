import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let selectedDistricts = [];  // Keep global selection
let selectedTrendMetric = "grad_# Graduated";  // Default starting metric

export function renderLineChart(data) {
  const margin = { top: 40, right: 150, bottom: 60, left: 60 };
  const width = 700 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#lineChart")
    .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto")
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);

  const xAxisGroup = svg.append("g")
    .attr("transform", `translate(0,${height})`);
  const yAxisGroup = svg.append("g");

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  const lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // --- Metric dropdown population ---
  const allColumns = Object.keys(data[0]).filter(k => k !== "District Name" && k !== "Year");

  const metricSelect = d3.select("#trendMetricSelect");
  metricSelect.selectAll("option")
    .data(allColumns)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d.replace(/_/g, " "));

  metricSelect.property("value", selectedTrendMetric);

  metricSelect.on("change", function() {
    selectedTrendMetric = this.value;
    update(selectedDistricts);
  });

  // --- District dropdown population ---
  const select = d3.select("#districtSelect")
    .attr("multiple", true)
    .attr("size", 6);

  const districts = Array.from(
    d3.group(data, d => d["District Name"])
  )
  .filter(([_, records]) =>
    records.some(d => {
      const val = d[selectedTrendMetric];
      return val && !isNaN(parseFloat(val.toString().replace("%", "").trim()));
    })
  )
  .map(([name]) => name)
  .sort();

  select.selectAll("option")
    .data(districts)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  select.on("change", function () {
    selectedDistricts = Array.from(this.selectedOptions).map(opt => opt.value);
    update(selectedDistricts);
  });

  function update(districtNames) {
    if (districtNames.length === 0) {
      svg.selectAll("*").remove();
      return;
    }

    const allSeries = districtNames.map((district, i) => {
      return {
        name: district,
        color: colorScale(i),
        values: data
          .filter(d => d["District Name"] === district)
          .map(d => ({
            year: +d.Year,
            value: parseFloat(d[selectedTrendMetric]?.toString().replace("%", "").trim())
          }))
          .filter(d => !isNaN(d.value))
          .sort((a, b) => a.year - b.year)
      };
    }).filter(series => series.values.length > 0);

    const allYears = allSeries.flatMap(s => s.values.map(v => v.year));
    const allValues = allSeries.flatMap(s => s.values.map(v => v.value));

    if (allSeries.length === 0) {
      svg.selectAll("*").remove();
      return;
    }

    xScale.domain(d3.extent(allYears));
    yScale.domain(d3.extent(allValues));

    xAxisGroup.call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    yAxisGroup.call(d3.axisLeft(yScale));

    svg.selectAll(".line-path").remove();
    svg.selectAll(".dot").remove();
    svg.selectAll(".legend-label").remove();

    allSeries.forEach(series => {
      // Line
      svg.append("path")
        .datum(series.values)
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

      // Dots
      svg.selectAll(null)
        .data(series.values)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", series.color);
    });

    // Legend
    svg.selectAll(".legend-label")
      .data(allSeries)
      .enter()
      .append("text")
      .attr("class", "legend-label")
      .attr("x", width + 10)
      .attr("y", (d, i) => i * 20)
      .style("fill", d => d.color)
      .style("font-size", "0.85rem")
      .text(d => d.name.length > 20 ? d.name.slice(0, 18) + "…" : d.name);
  }

  // Initial render: pick first two districts automatically
  update(districts.slice(0, 2));
}
