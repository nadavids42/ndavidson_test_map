// map.js - Massachusetts Education Map with Slider for Year Selection

Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  const width = 800;
  const height = 700;
  const svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

  const projection = d3.geoMercator().fitSize([width, height], districts);
  const path = d3.geoPath().projection(projection);

  const color = d3.scaleQuantize().domain([60, 100]).range(d3.schemeBlues[7]);

  const yearSlider = d3.select("#yearSlider");
  const yearValueLabel = d3.select("#yearValue");
  const subtitle = d3.select("#subtitle");

  // Extract available years and configure slider
  const allYears = Array.from(new Set(gradRates.map(d => +d["Year"]))).sort();
  const minYear = d3.min(allYears);
  const maxYear = d3.max(allYears);

  yearSlider
    .attr("min", minYear)
    .attr("max", maxYear)
    .attr("value", maxYear)
    .attr("step", 1);

  yearSlider.on("input", () => {
    const selectedYear = +yearSlider.node().value;
    subtitle.text(`Graduation Rate: ${selectedYear}`);
    yearValueLabel.text(selectedYear);
    updateMap(selectedYear);
  });

  function updateMap(selectedYear) {
    const gradByCode = {};

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

    const paths = svg.selectAll("path").data(districts.features);

    paths.enter()
      .append("path")
      .merge(paths)
      .attr("d", path)
      .attr("fill", d => {
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const rate = gradByCode[code];
        return rate ? color(rate) : "#ccc";
      })
      .attr("stroke", "#333")
      .selectAll("title").remove();

    svg.selectAll("path")
      .append("title")
      .text(d => {
        const name = d.properties.DISTRICT;
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const rate = gradByCode[code];
        return `${name} (${code})\nGraduation Rate: ${rate ?? 'N/A'}`;
      });

    paths.exit().remove();
  }

  // Initial render
  const initialYear = +yearSlider.node().value || maxYear;
  subtitle.text(`Graduation Rate: ${initialYear}`);
  yearValueLabel.text(initialYear);
  updateMap(initialYear);
});
