// map.js - Massachusetts Education Map Visualization using D3.js

Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  const selectedYear = 2021;

  // Create a lookup table for graduation rates
  const gradByCode = {};
  gradRates.forEach(d => {
    const code = d["District Code"].toString(); // No zero-padding
    if (+d["Year"] === selectedYear) {
      let rate = d["% Graduated"];
      if (typeof rate === "string") {
        rate = rate.replace("%", "").trim();
      }
      rate = parseFloat(rate);
      if (!isNaN(rate)) {
        gradByCode[code] = rate;
      }
    }
  });

  const allRates = Object.values(gradByCode);
  const width = 960;
  const height = 700;

  const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoAlbers()
    .center([0, 42.3])
    .rotate([71.8, 0])
    .parallels([29.5, 45.5])
    .scale(15000)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain(d3.extent(allRates)); // Dynamic domain based on actual data

  // Add a defs block for the legend gradient
  const defs = svg.append("defs");
  const legendGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  legendGradient.selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter().append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => colorScale(60 + d * 40)); // Assume min around 60

  // Draw the map
  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => {
      const code = d.properties.DISTCODE.toString(); // No padding
      const rate = gradByCode[code];
      return rate !== undefined ? colorScale(rate) : "#ccc";
    })
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .on("click", function (event, d) {
      const code = d.properties.DISTCODE.toString();
      const rate = gradByCode[code];
      const infoBox = document.getElementById("info-box");

      infoBox.innerHTML = `
        <h3 style="margin: 0 0 0.5rem 0">${d.properties.NAME}</h3>
        <p><strong>Graduation Rate:</strong> ${rate !== undefined ? `${rate.toFixed(1)}%` : "No Data"}</p>
        <p><strong>District Code:</strong> ${code}</p>
      `;
      infoBox.style.display = "block";
    });

  // Add a legend
  const legendWidth = 300;
  const legendHeight = 10;

  const legend = svg.append("g")
    .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)")
    .style("stroke", "#aaa")
    .style("stroke-width", 0.5);

  legend.append("text")
    .attr("x", 0)
    .attr("y", -5)
    .text("Graduation Rate")
    .style("fill", "#eee");

  legend.selectAll("text.labels")
    .data([60, 80, 100])
    .enter()
    .append("text")
    .attr("x", d => (d - 60) / 40 * legendWidth)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .text(d => `${d}%`)
    .style("fill", "#eee");
});
