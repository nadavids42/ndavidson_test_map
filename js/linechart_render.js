import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function renderLineChart(data) {
  const margin = { top: 40, right: 150, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
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

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  const lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.gradRate))
    .curve(d3.curveMonotoneX);

  // Axis labels
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

  // Tooltip
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

  // Multi-select dropdown
  const select = d3.select("#districtSelect")
    .attr("multiple", true)
    .attr("size", 6); // adjustable

  const districts = Array.from(new Set(data.map(d => d["District Name"]))).sort();
  select.selectAll("option")
    .data(districts)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  select.on("change", function () {
    const selected = Array.from(this.selectedOptions).map(opt => opt.value);
    update(selected);
  });

  function update(selectedDistricts) {
    const allSeries = selectedDistricts.map((district, i) => {
      return {
        name: district,
        color: colorScale(i),
        values: data
          .filter(d => d["District Name"] === district)
          .map(d => ({
            year: +d.Year,
            gradRate: parseFloat(d["grad_# Graduated"].replace("%", "").trim())
          }))
          .filter(d => !isNaN(d.gradRate))
          .sort((a, b) => a.year - b.year)
      };
    }).filter(series => series.values.length > 0);

    const allYears = allSeries.flatMap(s => s.values.map(v => v.year));
    const allRates = allSeries.flatMap(s => s.values.map(v => v.gradRate));

    if (allSeries.length === 0) {
      svg.selectAll(".line-path").remove();
      svg.selectAll(".dot").remove();
      svg.selectAll(".legend-label").remove();
      return;
    }

    xScale.domain(d3.extent(allYears));
    yScale.domain([0, 100]);

    xAxisGroup.transition().call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    yAxisGroup.transition().call(d3.axisLeft(yScale));

    svg.selectAll(".line-path").remove();
    svg.selectAll(".dot").remove();
    svg.selectAll(".legend-label").remove();

    allSeries.forEach(series => {
      // Draw line
      svg.append("path")
        .datum(series.values)
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

      // Dots
      //svg.selectAll(`.dot-${series.name.replace(/\s/g, "-")}`)
      svg.selectAll(null)
        .data(series.values)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.gradRate))
        .attr("r", 4)
        .attr("fill", series.color)
        .on("mouseover", function (event, d) {
          d3.select("#tooltip")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px")
            .style("display", "inline-block")
            .html(`${series.name}<br>Year: ${d.year}<br>Rate: ${d.gradRate.toFixed(1)}%`);
        })
        .on("mouseout", () => d3.select("#tooltip").style("display", "none"));
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

  // Initial render (first 2 districts)
  update(districts.slice(0, 2));
}
