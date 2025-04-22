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

  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");
  const subtitle = d3.select("#subtitle");

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

  // Initial map render
  let selectedYear = +yearSlider.value || 2021;
  yearValue.textContent = selectedYear;
  subtitle.text(`Graduation Rate: ${selectedYear}`);
  updateMap(selectedYear);

  // Slider event
  yearSlider.addEventListener("input", () => {
    selectedYear = +yearSlider.value;
    yearValue.textContent = selectedYear;
    subtitle.text(`Graduation Rate: ${selectedYear}`);
    updateMap(selectedYear);
  });
});
