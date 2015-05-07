module.exports = {
  pgConnection: null, // Postgres connection string
  pgQuery: null, // Postgres query
  csvFile: './examples/basic/boxes.csv', // Path to CSV file
  bbox: false, // Draw boxes instead of points (need columns: west, east, south, west)
  width: 4000,
  height: 3000,
  extent: [[-180, -85], [180, 85]], // Restrict data to this extent as well as scale map to fit this extent.
  background: 'rgba(255,255,255,1)', // Color for Canvas
  stroke: 'rgba(0,0,0,0.1)', // Stroke color for box data
  fill: 'rgba(255,255,255,0.1)', // Fill color for point data
  worldFile: null, // Geojson geography file that can be used to draw an outline behind the data
  worldColor: 'rgba(0,0,0,0.3)', // Color to draw the features in the `worldFile`
  fitToFeatures: false, // Will use the features in the `worldFile` to set scale. Useful for zooming to a particular region.
  extentColor: null, // draw extent in this color.  Null = don't draw
  alpha: 1.0, // global alpha for Canvas context
  imageName: 'test.png', // the output image filename
  colorizer: function(data){
    // function that process a row of data and then returns a color
    return 'rgba(0, 0, 0, 0.1)';
  }
};