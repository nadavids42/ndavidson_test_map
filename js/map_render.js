let selectedDistrict = null;

// map_render.js
export function renderMap(
  svg,
  districts,
  path,
  color,
  getValue,
  legendDomain,
  updateLegend,
  mapByCode,
  xByCode,
  yByCode,
  mapMetricObj,
  xMetricObj,
  yMetricObj,
  selectedYear
) {
  if (!mapMetricObj || !mapMetricObj.legend) {
    console.error("renderMap: mapMetricObj is missing or has no legend property", mapMetricObj);
  }
  updateLegend(legendDomain, mapMetricObj);

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

  // Only un-highlight if this is NOT the selected district
  if (selectedDistrict !== code) {
    d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);
    d3.selectAll(`#scatterplot circle[data-code='${code}']`)
      .attr("fill", "#009bcd")
      .attr("r", 6);
  }
})

    .on("click", function(event, d) {
  const code = d.properties.ORG8CODE?.toString().padStart(8, "0");
  const name = d.properties.DISTRICT_N;
  const mapVal = mapByCode[code];
  const xVal = xByCode[code];
  const yVal = yByCode[code];

  const isSame = selectedDistrict === code;

  // Clear all highlights
  d3.selectAll("g.districts path")
    .attr("stroke", "#333")
    .attr("stroke-width", 1);

  d3.selectAll("#scatterplot circle")
    .attr("fill", "#009bcd")
    .attr("r", 6);

  if (isSame) {
    selectedDistrict = null;
    document.getElementById("info-box").style.display = "none";
    return;
  }

  selectedDistrict = code;

  // Highlight map
  d3.select(this)
    .attr("stroke", "#ff6600")
    .attr("stroke-width", 4);

  // Highlight scatter
  d3.select(`#scatterplot circle[data-code='${code}']`)
    .attr("fill", "#ff6600")
    .attr("r", 10);

  const infoBox = document.getElementById("info-box");
  infoBox.innerHTML = `
    <h3 style="margin-top: 0">${name || "Unknown District"}</h3>
    <p><strong>District Code:</strong> ${code}</p>
    <p><strong>${mapMetricObj.label}:</strong> ${mapMetricObj.format(mapVal)}</p>
    <p><strong>${xMetricObj.label} (X):</strong> ${xMetricObj.format(xVal)}</p>
    <p><strong>${yMetricObj.label} (Y):</strong> ${yMetricObj.format(yVal)}</p>
  `;
  infoBox.style.display = "block";
});

  svg.selectAll("g.districts path").selectAll("title").remove();
}
