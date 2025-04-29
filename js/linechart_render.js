// linechart_render.js

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function renderLineChart(data) {
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 700 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#lineChart")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);

  const xAxisGroup = svg.append("g")
    .attr("transform", `translate(0,${height})`);
  const yAxisGroup = svg.append("g");

  const lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.gradRate));

  // Prepare dropdown
  const select = d3.select("#districtSelect");
  const districts = Array.from(new Set(data.map(d => d["District Name"])));

  select.selectAll("option")
    .data(districts)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  select.on("change", function () {
    update(this.value);
  });

  function update(districtName) {
    const filteredData = data
      .filter(d => d["District Name"] === districtName)
      .map(d => ({
        year: +d.Year,
        gradRate: parseFloat(d["grad_# Graduated"].replace("%", "").trim())
      }))
      .sort((a, b) => a.year - b.year);

    xScale.domain(d3.extent(filteredData, d => d.year));
    yScale.domain([0, 100]);

    xAxisGroup.transition().call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    yAxisGroup.transition().call(d3.axisLeft(yScale));

    svg.selectAll(".line-path").remove();

    svg.append("path")
      .datum(filteredData)
      .attr("class", "line-path")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineGenerator);
  }

  // Initial render
  update(districts[0]);
}
