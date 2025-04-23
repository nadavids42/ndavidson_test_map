// map.js - Option 1: Toggle between Graduation Rate and Salary Color

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

  // --- Controls ---
  const metricSelect = d3.select("#metricSelect");
  const yearSlider = d3.select("#yearSlider");
  const yearValueLabel = d3.select("#yearValue");
  const subtitle = d3.select("#subtitle");

  // --- Data years & metrics ---
  const allYears = Array.from(new Set(gradRates.map(d => +d["Year"]))).sort();
  const minYear = d3.min(allYears);
  const maxYear = d3.max(allYears);

  yearSlider
    .attr("min", minYear)
    .attr("max", maxYear)
    .attr("value", maxYear)
    .attr("step", 1);

  // --- Populate metric dropdown if not already there ---
  if (metricSelect.empty()) {
    // Only create dropdown if not present
    d3.select(subtitle.node().parentNode)
      .insert("select", "#yearSlider")
      .attr("id", "metricSelect")
      .selectAll("option")
      .data([
        {value: "grad", label: "Graduation Rate"},
        {value: "salary", label: "Average Salary"}
      ])
      .enter()
      .append("option")
      .attr("value", d => d.value)
      .text(d => d.label);
  }

  // --- Data pre-processing for fast lookup ---
  function buildMetricLookups(selectedYear) {
    // Graduation rates
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

    // Salary
    const salaryByCode = {};
    salaries.forEach(d => {
      const code = d["District Code"].toString().padStart(8, "0");
      if (+d["Year"] === selectedYear) {
        let salary = d["Average Salary"];
        if (typeof salary === "string") {
          salary = salary.replace("$", "").replace(",", "").trim();
        }
        salary = parseFloat(salary);
        if (!isNaN(salary)) {
          salaryByCode[code] = salary;
        }
      }
    });

    return { gradByCode, salaryByCode };
  }

  // --- Draw map paths once ---
  svg.append("g").attr("class", "districts")
    .selectAll("path")
    .data(districts.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#333");

  // --- Legend gradient (will be updated for salary vs. grad) ---
  const legendWidth = 300;
  const legendHeight = 10;
  const defs = svg.append("defs");
  let legendGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)")
    .style("stroke", "#aaa");

  const legendTitle = legend.append("text")
    .attr("x", 0)
    .attr("y", -5)
    .style("fill", "#eee");

  const legendLabels = legend.selectAll("text.labels")
    .data([0, 0, 0])
    .enter()
    .append("text")
    .attr("class", "labels")
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("fill", "#eee");

  function updateLegend(domain, metric) {
    // Remove previous stops
    legendGradient.selectAll("stop").remove();
    if (metric === "grad") {
      // Graduation rate: 60–100, blue
      legendGradient.selectAll("stop")
        .data(d3.range(60, 101))
        .enter().append("stop")
        .attr("offset", d => `${((d - 60) / 40) * 100}%`)
        .attr("stop-color", d => d3.interpolateBlues((d - 60) / 40));
      legendTitle.text("Graduation Rate");
      legendLabels.data([60, 80, 100])
        .attr("x", d => (d - 60) / 40 * legendWidth)
        .text(d => `${d}%`);
    } else {
      // Salary: dynamic domain, green
      const [minS, maxS] = domain;
      legendGradient.selectAll("stop")
        .data(d3.range(minS, maxS + 1, (maxS - minS) / 100))
        .enter().append("stop")
        .attr("offset", s => `${((s - minS) / (maxS - minS)) * 100}%`)
        .attr("stop-color", s => d3.interpolateGreens((s - minS) / (maxS - minS)));
      legendTitle.text("Average Salary");
      legendLabels.data([minS, Math.round((minS + maxS) / 2), maxS])
        .attr("x", (d, i) => i === 0 ? 0 : (i === 1 ? legendWidth / 2 : legendWidth))
        .text(d => `$${d.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    }
  }

  function updateMap(selectedYear, metric) {
    const { gradByCode, salaryByCode } = buildMetricLookups(selectedYear);

    let color, getValue, legendDomain;
    if (metric === "grad") {
      color = d3.scaleQuantize().domain([60, 100]).range(d3.schemeBlues[7]);
      getValue = code => gradByCode[code];
      legendDomain = [60, 100];
    } else {
      // Only use salary values that exist for the current year for color scale
      const salariesThisYear = Object.values(salaryByCode).filter(s => s > 0);
      const minS = Math.floor(d3.min(salariesThisYear) / 1000) * 1000;
      const maxS = Math.ceil(d3.max(salariesThisYear) / 1000) * 1000;
      color = d3.scaleQuantize().domain([minS, maxS]).range(d3.schemeGreens[7]);
      getValue = code => salaryByCode[code];
      legendDomain = [minS, maxS];
    }

    // Update legend
    updateLegend(legendDomain, metric);

    svg.selectAll("g.districts path")
      .attr("fill", d => {
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const val = getValue(code);
        return val ? color(val) : "#ccc";
      })
      .on("click", function(event, d) {
        const name = d.properties.DISTRICT_N;
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const rate = gradByCode[code];
        const salary = salaryByCode[code];
        const infoBox = document.getElementById("info-box");
        infoBox.innerHTML = `
          <h3 style="margin-top: 0">${name || "Unknown District"}</h3>
          <p><strong>District Code:</strong> ${code}</p>
          <p><strong>Graduation Rate:</strong> ${rate !== undefined ? rate.toFixed(1) + "%" : "N/A"}</p>
          <p><strong>Average Salary:</strong> ${salary !== undefined ? "$" + salary.toLocaleString(undefined, {maximumFractionDigits: 0}) : "N/A"}</p>
        `;
        infoBox.style.display = "block";
      });

    svg.selectAll("g.districts path").selectAll("title").remove();
  }

  // --- Event Listeners ---
  function rerender() {
    const selectedYear = +yearSlider.node().value || maxYear;
    const selectedMetric = metricSelect.node().value;
    subtitle.text(
      `${metricSelect.node().selectedOptions[0].text}: ${selectedYear}`
    );
    yearValueLabel.text(selectedYear);
    updateMap(selectedYear, selectedMetric);
  }

  yearSlider.on("input", rerender);
  metricSelect.on("change", rerender);

  // --- Initial render ---
  rerender();
});
