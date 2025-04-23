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
    .append("title") // Tooltip with rate info
    .text(d => {
      const code = d.properties.DISTCODE.padStart(8, "0");
      const rate = gradByCode[code];
      return rate !== undefined ? `${d.properties.NAME}: ${rate.toFixed(1)}%` : `${d.properties.NAME}: No Data`;
    });
});
