Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  console.log("GeoJSON loaded:", districts.features.length, "features");
  console.log("Graduation rates:", gradRates.length, "rows");
  console.log("Salaries:", salaries.length, "rows");

  // Optional: visualize one district just to verify it renders
  const width = 800;
  const height = 700;

  const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoMercator()
    .fitSize([width, height], districts);

  const path = d3.geoPath().projection(projection);

  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#444")
    .attr("stroke", "#999");
});
