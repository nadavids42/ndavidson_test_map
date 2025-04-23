// map.js - Massachusetts Education Map Visualization using D3.js

Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),  // GeoJSON for school district boundaries
  d3.csv("data/Cleaned_grad_rates.csv"),         // CSV with graduation rates by year
  d3.csv("data/Cleaned_salaries.csv")            // CSV with teacher salaries by year
]).then(([districts, gradRates, salaries]) => {
  const selectedYear = 2021;  // Default year for data filtering

  // Create a lookup table for graduation rates by district code
  const gradByCode = {};
  gradRates.forEach(d => {
    const code = d["District Code"].toString().padStart(8, "0"); // Normalize district code
    if (+d["Year"] === selectedYear) {
      let rate = d["% Graduated"];
      if (typeof rate === "string") {
        rate = rate.replace("%", "").trim(); // Remove percent sign and whitespace
      }
      rate = parseFloat(rate);
      if (!isNaN(rate)) {
        gradByCode[code] = rate; // Add to lookup if valid number
      }
    }
  });

  // Set up SVG canvas dimensions
  const width = 960;
  const height = 700;

  // Create an SVG element and append to the #map container
  const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Define a geographical projection centered on Massachusetts
  const projection = d3.geoAlbers()
    .center([0, 42.3])
    .rotate([71.8, 0])
    .parallels([29.5, 45.5])
    .scale(15000)
    .translate([width / 2, height / 2]);

  // Create a path generator based on the projection
  const path = d3.geoPath().projection(projection);

  // Define a color scale for graduation rates
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([60, 100]); // Expected graduation rate range

  // Add a legend for the color scale
const legendWidth = 300;
const legendHeight = 10;

const legendSvg = svg.append("g")
  .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

const legendGradient = svg.append("defs")
  .append("linearGradient")
  .attr("id", "legend-gradient");

legendGradient.selectAll("stop")
  .data(d3.ticks(0, 1, 10))
  .enter().append("stop")
  .attr("offset", d => `${d * 100}%`)
  .attr("stop-color", d => colorScale(60 + d * 40));

legendSvg.append("rect")
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", "url(#legend-gradient)")
  .style("stroke", "#aaa")
  .style("stroke-width", 0.5);

legendSvg.append("text")
  .attr("x", 0)
  .attr("y", -5)
  .text("Graduation Rate")
  .style("fill", "#eee");

legendSvg.selectAll("text.labels")
  .data([60, 80, 100])
  .enter()
  .append("text")
  .attr("x", d => (d - 60) / 40 * legendWidth)
  .attr("y", 25)
  .attr("text-anchor", "middle")
  .text(d => `${d}%`)
  .style("fill", "#eee");


  // Add districts to the map
  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path) // Draw each district
    .attr("fill", d => {
      const code = d.properties.DISTCODE.padStart(8, "0");
      const rate = gradByCode[code];
      return rate !== undefined ? colorScale(rate) : "#ccc"; // Gray for missing data
    })
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .on("click", function(event, d) {
  const code = d.properties.DISTCODE.padStart(8, "0");
  const rate = gradByCode[code];
  const infoBox = document.getElementById("info-box");

  infoBox.innerHTML = `
    <h3>${d.properties.NAME}</h3>
    <p><strong>Graduation Rate:</strong> ${rate !== undefined ? `${rate.toFixed(1)}%` : "No Data"}</p>
    <p><strong>District Code:</strong> ${code}</p>
  `;
  infoBox.style.display = "block";
});
