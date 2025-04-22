Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  const selectedYear = 2021;

  // Build lookup from District Code to graduation rate
  const gradByCode = {};
  gradRates.forEach(d => {
    if (+d.year === selectedYear) {
      gradByCode[d["District Code"].trim()] = +d.graduation_rate;
    }
  });

  const width = 800;
  const height = 700;

  const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoMercator()
    .fitSize([width, height], districts);

  const path = d3.geoPath().projection(projection);

  const color = d3.scaleQuantize()
    .domain([60, 100])  // You can tweak this range
    .range(d3.schemeBlues[7]);

  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => {
      const code = d.properties.ORG8CODE;
      const rate = gradByCode[code];
      return rate ? color(rate) : "#ccc";
    })
    .attr("stroke", "#333")
    .append("title")
    .text(d => {
      const name = d.properties.DISTRICT;
      const code = d.properties.ORG8CODE;
      const rate = gradByCode[code];
      return `${name} (${code})\nGraduation Rate (${selectedYear}): ${rate ?? 'N/A'}`;
    });
});
