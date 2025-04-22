Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  // Choose a year to display
  const selectedYear = 2021;

  // Filter grad data for that year
  const gradByDistrict = {};
  gradRates.forEach(d => {
    if (+d.year === selectedYear) {
      gradByDistrict[d.district_name.trim().toLowerCase()] = +d.graduation_rate;
    }
  });

  // Create SVG and projection
  const width = 800;
  const height = 700;

  const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoMercator()
    .fitSize([width, height], districts);

  const path = d3.geoPath().projection(projection);

  // Color scale
  const color = d3.scaleQuantize()
    .domain([60, 100])  // adjust range based on your data
    .range(d3.schemeBlues[7]);

  // Draw districts
  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => {
      const name = d.properties.DISTRICT.trim().toLowerCase();
      const rate = gradByDistrict[name];
      return rate ? color(rate) : "#ccc";
    })
    .attr("stroke", "#333")
    .append("title") // basic tooltip
    .text(d => {
      const name = d.properties.DISTRICT;
      const rate = gradByDistrict[name.trim().toLowerCase()];
      return `${name}\nGraduation Rate (${selectedYear}): ${rate ?? 'N/A'}`;
    });
});
