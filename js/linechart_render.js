import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { METRICS } from "./metrics.js";

let selectedDistricts = [];
let selectedMetricCol = METRICS[0].col; // Default metric

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

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Populate metric dropdown
  trendSelect.on("change", function () {
  selectedMetricCol = this.value;

  // Repopulate district options based on the new metric
  const districts = Array.from(
    d3.group(data, d => d["District Name"])
  )
    .filter(([_, records]) =>
      records.some(d => {
        const val = d[selectedMetricCol];
        return val && !isNaN(parseFloat(val.toString().replace(/[%$,]/g, "").trim()));
      })
    )
    .map(([name]) => name)
    .sort();

  // Clear and re-populate districtSelect
  select.selectAll("option").remove();
  select.selectAll("option")
    .data(districts)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Restore previous selection if available
  if (selectedDistricts.length > 0) {
    select.selectAll("option").property("selected", d => selectedDistricts.includes(d));
  } else {
    selectedDistricts = districts.slice(0, 2);
    select.selectAll("option").property("selected", d => selectedDistricts.includes(d));
  }

  update(selectedDistricts);
});


  // Populate district dropdown
  const select = d3.select("#districtSelect")
    .attr("multiple", true)
    .attr("size", 6);

  const districts = Array.from(
    d3.group(data, d => d["District Name"])
  )
    .filter(([_, records]) =>
      records.some(d => {
        const val = d[selectedMetricCol];
        return val && !isNaN(parseFloat(val.toString().replace(/[%$,]/g, "").trim()));
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
    svg.selectAll("*").remove();

    if (districtNames.length === 0) return;

    const metricMeta = METRICS.find(m => m.col === selectedMetricCol);
    if (!metricMeta) return;

    const allSeries = districtNames.map((district, i) => {
      return {
        name: district,
        color: colorScale(i),
        values: data
          .filter(d => d["District Name"] === district)
          .map(d => ({
            year: +d.Year,
            value: parseFloat(
              d[selectedMetricCol]?.toString().replace(/[%$,]/g, "").trim()
            )
          }))
          .filter(d => !isNaN(d.value))
          .sort((a, b) => a.year - b.year)
      };
    }).filter(series => series.values.length > 0);

    const allYears = allSeries.flatMap(s => s.values.map(v => v.year));
    const allValues = allSeries.flatMap(s => s.values.map(v => v.value));

    const xScale = d3.scaleLinear().range([0, width]).domain(d3.extent(allYears));
    const yScale = d3.scaleLinear().range([height, 0]).domain(d3.extent(allValues));

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    svg.append("g").call(yAxis);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .style("text-anchor", "middle")
      .style("fill", "#ccc")
      .text("Year");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .style("text-anchor", "middle")
      .style("fill", "#ccc")
      .text(metricMeta.label);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "17px")
      .attr("font-weight", "bold")
      .attr("fill", "#2b97e0")
      .text(`${metricMeta.label} Over Time`);

    const lineGenerator = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Tooltip setup
    let tooltip = d3.select("#lineChart-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("id", "lineChart-tooltip")
        .style("position", "absolute")
        .style("display", "none")
        .style("background", "#222")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "0.85rem")
        .style("z-index", "999");
    }

    allSeries.forEach(series => {
      svg.append("path")
        .datum(series.values)
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

      svg.selectAll(null)
        .data(series.values)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", series.color)
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 6);
          tooltip
            .html(`${series.name}<br>Year: ${d.year}<br>${metricMeta.label}: ${metricMeta.format(d.value)}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px")
            .style("display", "inline-block");
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 4);
          tooltip.style("display", "none");
        });
    });

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

  // Initial render
  update(districts.slice(0, 2));
}
