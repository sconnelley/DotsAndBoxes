module.exports = {
  pgConnection: null,
  pgQuery: null,
  csvFile: './examples/fit-to-features/africa.csv',
  bbox: true,
  width: 4000,
  height: 3000,
  extent: [[-180, -85], [180, 85]],
  background: 'rgba(255,255,255,1)',
  stroke: 'rgba(0,0,0,0.1)',
  fill: 'rgba(255,255,255,0.1)',
  worldColor: 'rgba(0,0,0,0.3)',
  worldFile: './examples/fit-to-features/africa.geojson',
  fitToFeatures: true,
  extentColor: null,
  alpha: 1.0,
  imageName: 'africa.png',
  colorizer: function(data){
    return 'rgba(0, 0, 0, 0.1)';
  }
};