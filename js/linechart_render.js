import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function renderLineChart(data) {
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
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
    .y(d => yScale(d.gradRate))
    .curve(d3.curveMonotoneX); // smooth the line

  // --- Axis labels ---
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .style("text-anchor", "middle")
    .style("fill", "#ccc")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .style("text-anchor", "middle")
    .style("fill", "#ccc")
    .text("Graduation Rate (%)");

  // Tooltip div (in case it's not already in the HTML)
  if (d3.select("#tooltip").empty()) {
    d3.select("body").append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "#222")
      .style("color", "#fff")
      .style("padding", "5px 8px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "0.85rem")
      .style("z-index", "999");
  }

  // Prepare dropdown
  const select = d3.select("#districtSelect");
  const districts = Array.from(new Set(data.map(d => d["District Name"]))).sort();

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
      .filter(d => !isNaN(d.gradRate))
      .sort((a, b) => a.year - b.year);

    if (filteredData.length === 0) {
      svg.selectAll(".line-path").remove();
      svg.selectAll(".dot").remove();
      return;
    }

    xScale.domain(d3.extent(filteredData, d => d.year));
    yScale.domain([0, 100]);

    xAxisGroup.transition().call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    yAxisGroup.transition().call(d3.axisLeft(yScale));

    svg.selectAll(".line-path").remove();
    svg.selectAll(".dot").remove();

    svg.append("path")
      .datum(filteredData)
      .attr("class", "line-path")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineGenerator);

    // Add data points
    svg.selectAll(".dot")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => yScale(d.gradRate))
      .attr("r", 4)
      .attr("fill", "steelblue")
      .on("mouseover", function (event, d) {
        d3.select("#tooltip")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .style("display", "inline-block")
          .html(`Year: ${d.year}<br>Rate: ${d.gradRate.toFixed(1)}%`);
      })
      .on("mouseout", () => d3.select("#tooltip").style("display", "none"));
  }

  // Initial render
  update(districts[0]);
}
