// map.js - 50-100% Graduation Rate Scale for Map & Scatterplot

Promise.all([
  d3.json("data/SchoolDistricts_poly.geojson"),
  d3.csv("data/Cleaned_grad_rates.csv"),
  d3.csv("data/Cleaned_salaries.csv")
]).then(([districts, gradRates, salaries]) => {
  const width = 800;
  const height = 600;
  const svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

  // --- Scatterplot config ---
  const scatterWidth = 480;
  const scatterHeight = 480;
  const margin = {top: 30, right: 30, bottom: 60, left: 70};

  const scatterSvg = d3.select("#scatterplot")
    .append("svg")
    .attr("width", scatterWidth)
    .attr("height", scatterHeight);

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

  if (metricSelect.empty()) {
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

  // --- Legend gradient ---
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

  // --- Main update function (map + scatterplot) ---
  function updateLegend(domain, metric) {
    // Remove previous stops
    legendGradient.selectAll("stop").remove();
    if (metric === "grad") {
      legendGradient.selectAll("stop")
        .data(d3.range(50, 101))
        .enter().append("stop")
        .attr("offset", d => `${((d - 50) / 50) * 100}%`)
        .attr("stop-color", d => d3.interpolateBlues((d - 50) / 50));
      legendTitle.text("Graduation Rate");
      legendLabels.data([50, 75, 100])
        .attr("x", d => (d - 50) / 50 * legendWidth)
        .text(d => `${d}%`);
    } else {
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

  function updateScatterplot(gradByCode, salaryByCode, selectedYear) {
    // Prepare data
    const scatterData = Object.keys(gradByCode)
      .filter(code => salaryByCode[code] !== undefined)
      .map(code => ({
        code,
        grad: gradByCode[code],
        salary: salaryByCode[code],
        name: (districts.features.find(f => (f.properties.ORG8CODE?.toString().padStart(8, "0")) === code) || {}).properties?.DISTRICT_N || "Unknown"
      }));

    // Axis domains
    const xExtent = d3.extent(scatterData, d => d.salary);

    // Scales
    const x = d3.scaleLinear().domain([xExtent[0]*0.97, xExtent[1]*1.03]).range([margin.left, scatterWidth - margin.right]);
    const y = d3.scaleLinear().domain([50, 100]).range([scatterHeight - margin.bottom, margin.top]);

    // Clear plot area
    scatterSvg.selectAll("*").remove();

    // Axes
    scatterSvg.append("g")
      .attr("transform", `translate(0,${scatterHeight - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d => `$${d3.format(",.0f")(d)}`));
    scatterSvg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d => `${d}%`));

    scatterSvg.append("text")
      .attr("x", scatterWidth / 2)
      .attr("y", scatterHeight - 18)
      .attr("text-anchor", "middle")
      .attr("fill", "#222")
      .attr("font-size", "14px")
      .text("Average Teacher Salary");

    scatterSvg.append("text")
      .attr("x", -scatterHeight / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", "#222")
      .attr("font-size", "14px")
      .text("Graduation Rate (%)");

    // Points
    scatterSvg.selectAll("circle")
      .data(scatterData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.salary))
      .attr("cy", d => y(d.grad))
      .attr("r", 6)
      .attr("fill", "#009bcd")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.2)
      .attr("data-code", d => d.code)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#ff6600").attr("r", 10);
        // Highlight corresponding map path
        d3.selectAll(`#map path[data-code='${d.code}']`)
          .attr("stroke", "#ff6600")
          .attr("stroke-width", 4);
        // Show tooltip
        let tooltip = d3.select("#scatterplot-tooltip");
        if (tooltip.empty()) {
          tooltip = d3.select("body").append("div").attr("id", "scatterplot-tooltip");
        }
        tooltip.html(
          `<strong>${d.name}</strong><br>
          Graduation Rate: ${d.grad.toFixed(1)}%<br>
          Salary: $${d.salary.toLocaleString(undefined, {maximumFractionDigits: 0})}`
        )
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#fff")
        .style("color", "#222")
        .style("border", "1px solid #ccc")
        .style("border-radius", "6px")
        .style("padding", "7px 11px")
        .style("font-size", "15px")
        .style("box-shadow", "0 1px 4px #0002")
        .style("left", (event.pageX + 18) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("display", "block");
      })
      .on("mousemove", function(event) {
        d3.select("#scatterplot-tooltip")
          .style("left", (event.pageX + 18) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).attr("fill", "#009bcd").attr("r", 6);
        d3.selectAll(`#map path[data-code='${d.code}']`)
          .attr("stroke", "#333")
          .attr("stroke-width", 1);
        d3.select("#scatterplot-tooltip").remove();
      })
      .on("click", function(event, d) {
        // Highlight in info box
        const infoBox = document.getElementById("info-box");
        infoBox.innerHTML = `
          <h3 style="margin-top: 0">${d.name || "Unknown District"}</h3>
          <p><strong>District Code:</strong> ${d.code}</p>
          <p><strong>Graduation Rate:</strong> ${d.grad !== undefined ? d.grad.toFixed(1) + "%" : "N/A"}</p>
          <p><strong>Average Salary:</strong> ${d.salary !== undefined ? "$" + d.salary.toLocaleString(undefined, {maximumFractionDigits: 0}) : "N/A"}</p>
        `;
        infoBox.style.display = "block";
      });

    scatterSvg.append("text")
      .attr("x", scatterWidth / 2)
      .attr("y", margin.top - 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "17px")
      .attr("font-weight", "bold")
      .attr("fill", "#1a3344")
      .text(`Graduation Rate vs. Salary (${selectedYear})`);
  }

  function updateMap(selectedYear, metric) {
    const { gradByCode, salaryByCode } = buildMetricLookups(selectedYear);

    let color, getValue, legendDomain;
    if (metric === "grad") {
      color = d3.scaleQuantize().domain([50, 100]).range(d3.schemeBlues[7]);
      getValue = code => gradByCode[code];
      legendDomain = [50, 100];
    } else {
      const salariesThisYear = Object.values(salaryByCode).filter(s => s > 0);
      const minS = Math.floor(d3.min(salariesThisYear) / 1000) * 1000;
      const maxS = Math.ceil(d3.max(salariesThisYear) / 1000) * 1000;
      color = d3.scaleQuantize().domain([minS, maxS]).range(d3.schemeGreens[7]);
      getValue = code => salaryByCode[code];
      legendDomain = [minS, maxS];
    }

    updateLegend(legendDomain, metric);

    svg.selectAll("g.districts path")
      .attr("fill", d => {
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        const val = getValue(code);
        return val ? color(val) : "#ccc";
      })
      .attr("data-code", d => d.properties.ORG8CODE?.toString().padStart(8, "0"))
      .on("mouseover", function(event, d) {
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        d3.select(this).attr("stroke", "#ff6600").attr("stroke-width", 4);
        d3.selectAll(`#scatterplot circle[data-code='${code}']`)
          .attr("fill", "#ff6600")
          .attr("r", 10);
      })
      .on("mouseleave", function(event, d) {
        const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);
        d3.selectAll(`#scatterplot circle[data-code='${code}']`)
          .attr("fill", "#009bcd")
          .attr("r", 6);
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

    // --- Update scatterplot as well ---
    updateScatterplot(gradByCode, salaryByCode, selectedYear);
  }

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
