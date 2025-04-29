export function loadData() {
  return Promise.all([
    d3.json("/data/SchoolDistricts_poly.geojson"),
    d3.csv("/data/Cleaned_data.csv"),
    d3.json("/data/Massachusetts_districts.geojson")
  ]);
}
