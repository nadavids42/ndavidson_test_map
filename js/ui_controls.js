export function setupControls(
  metricSelect,
  yearSlider,
  rerender,
  minYear,
  maxYear,
  defaultYear,
  METRICS,
  defaultMetricKey = "grad"
) {
  // Populate metric dropdown
  metricSelect.selectAll("option").remove();
  metricSelect.selectAll("option")
    .data(METRICS)
    .enter().append("option")
    .attr("value", d => d.key)
    .text(d => d.label);

  // Set initial value
  metricSelect.property("value", defaultMetricKey);

  // Only try to set yearSlider attributes if it's present
  if (yearSlider) {
    yearSlider
      .attr("min", minYear)
      .attr("max", maxYear)
      .attr("value", defaultYear)
      .attr("step", 1)
      .on("input", rerender);
  }

  metricSelect.on("change", rerender);
}
