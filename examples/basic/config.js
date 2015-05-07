module.exports = {
  pgConnection: null,
  pgQuery: null,
  csvFile: './examples/basic/boxes.csv',
  bbox: true,
  width: 4000,
  height: 3000,
  extent: [[-180, -85], [180, 85]],
  background: 'rgba(255,255,255,1)',
  stroke: 'rgba(0,0,0,0.1)',
  fill: 'rgba(255,255,255,0.1)',
  //worldColor: 'rgba(0,0,0,0.3)',
  worldFile: null,
  fitToFeatures: true,
  extentColor: null,
  alpha: 1.0,
  imageName: 'boxes-example.png',
  colorizer: function(data){
    var url = data.provider || '';
    if (url.indexOf('openstreetmap.org') > -1) return 'rgba(0, 188, 212, 0.1)';
    if (url.indexOf('toner-lite') > -1) return 'rgba(255, 193, 7, 0.1)';
    if (url.indexOf('boner') > -1) return 'rgba(233, 30, 99, 0.1)' ;
    if (url.indexOf('bing-lite') > -1) return 'rgba(76, 175, 80, 0.1)';
    if (url.indexOf('openstreetmap.fr/hot') > -1) return 'rgba(156, 39, 176, 0.1)';
    if (url.indexOf('stamen.i808gmk6') > -1) return 'rgba(160, 80, 0, 0.1)';
    if (url.indexOf('opencyclemap.org') > -1) return 'rgba(215, 112, 173, 0.1)';
    return 'rgba(96, 125, 139, 0.1)';
  }
};