Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  let selectedYear = 2021;
  const gradByCode = {};

  const width = 800;
  const height = 600;

  const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoMercator()
    .fitSize([width, height], districts);

  const path = d3.geoPath().projection(projection);

  // Color scale for graduation rates
  const colorScale = d3.scaleLinear()
    .domain([60, 100])
    .range(["#f87171", "#22c55e"]);

  // Draw base map
  svg.selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#333")
    .attr("fill", "#ccc")
    .attr("class", "district");

  // Setup slider
  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");

  yearSlider.addEventListener("input", () => {
    selectedYear = +yearSlider.value;
    yearValue.textContent = selectedYear;
    updateMap();
  });

  // Initial map draw
  updateMap();

  function updateMap() {
    // Clear and rebuild gradByCode
    Object.keys(gradByCode).forEach(k => delete gradByCode[k]);

    gradRates.forEach(d => {
      const code = d["District Code"].toString().padStart(8, "0");
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

    // Color map by grad rate
    svg.selectAll(".district")
      .transition()
      .duration(500)
      .attr("fill", d => {
        const code = d.properties.DISTRICT.toString().padStart(8, "0");
        const rate = gradByCode[code];
