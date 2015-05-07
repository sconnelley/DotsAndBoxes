module.exports = {
  pgConnection: null,
  pgQuery: null,
  csvFile: './examples/fit-to-box/nepal.csv',
  bbox: true,
  width: 4000,
  height: 3000,
  extent: [[-180, -85], [180, 85]],
  fitToBox: [[85.22828, 27.64040],[85.44800, 27.76807]],
  background: 'rgba(255,255,255,1)',
  stroke: 'rgba(0,0,0,0.1)',
  fill: 'rgba(255,255,255,0.1)',
  worldColor: 'rgba(0, 0, 0, 0.1)',
  worldFile: './examples/fit-to-box/nepal.geojson',
  fitToFeatures: false,
  extentColor: null,
  alpha: 1.0,
  imageName: 'kathmandu.png',
  colorizer: function(data){
    return 'rgba(0, 0, 0, 0.1)';
  }
};