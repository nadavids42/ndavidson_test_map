// map.js - Massachusetts Education Map with Slider, Gradient Legend, and Click Info

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

  // --- Draw map paths once ---
  const features = svg.append("g").attr("class", "districts")
    .selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#333");

  // --- LEGEND (blue gradient, always visible and on top) ---
  const legendWidth = 300;
  const legendHeight = 10;

  const defs = svg.append("defs");
  const legendGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  // Use d3.interpolateBlues for a smooth color ramp
  legendGradient.selectAll("stop")
    .data(d3.range(0, 1.01, 0.01)) // 0, 0.01, ... 1.0
    .enter().append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => d3.interpolateBlues(d));

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)")
    .style("stroke", "#aaa");

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

    svg.selectAll("g.districts path")
      .attr("fill", d => {
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const rate = gradByCode[code];
        return rate ? color(rate) : "#ccc";
      })
      .on("click", function(event, d) {
        const name = d.properties.DISTRICT_N;  // Correct property for name
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const rate = gradByCode[code];

        const infoBox = document.getElementById("info-box");
        infoBox.innerHTML = `
          <h3 style="margin-top: 0">${name || "Unknown District"}</h3>
          <p><strong>District Code:</strong> ${code}</p>
          <p><strong>Graduation Rate:</strong> ${rate !== undefined ? rate.toFixed(1) + "%" : "N/A"}</p>
        `;
        infoBox.style.display = "block";
      });

    // Remove hover tooltips if any exist
    svg.selectAll("g.districts path").selectAll("title").remove();
  }

  // Initial render
  const initialYear = +yearSlider.node().value || maxYear;
  subtitle.text(`Graduation Rate: ${initialYear}`);
  yearValueLabel.text(initialYear);
  updateMap(initialYear);
});
