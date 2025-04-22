Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  const selectedYear = 2021;

  // Build lookup from District Code to graduation rate
  const gradByCode = {};
  gradRates.forEach(d => {
    const code = d["District Code"].toString().padStart(8, "0");
    if (+d["Year"] === selectedYear) {
      gradByCode[code] = +d["Graduation Rate"];
    }
  });

  console.log("Sample gradByCode lookup:", Object.entries(gradByCode).slice(0, 5));

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
    .domain([60, 100]) // tweak this range as needed
    .range(d3.schemeBlues[7]);

  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => {
      const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
      const rate = gradByCode[code];

      if (!rate) {
        console.log(`No data for code: ${code}`);
      }

      return rate ? color(rate) : "#ccc";
    })
    .attr("stroke", "#333")
    .append("title")
    .text(d => {
      const name = d.properties.DISTRICT;
      const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
      const rate = gradByCode[code];
      return `${name} (${code})\nGraduation Rate (${selectedYear}): ${rate ?? 'N/A'}`;
    });
});
