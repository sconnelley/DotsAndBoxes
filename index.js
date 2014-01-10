/*
    DotsOnAMap

    node index.js -w 5000 -h 5000 -c 'CONNECTION_STRING' \
    -q 'QUERY_STRING'

*/

var argv = require('optimist')
    .usage('Draw points on a map!')
    .demand('c')
    .alias('c', 'conn')
    .describe('c', 'Postgres connection string')
    .demand('q')
    .alias('q', 'query')
    .describe('q', 'Postgres query string. Row object needs to contain a lat & lng property.')
    .default('w', 2000)
    .default('h', 2000)
    .describe('w', 'Map width')
    .describe('h', 'Map height')
    .argv;


var pg = require('pg'),
    hstore = require('node-postgres-hstore'),
    QueryStream = require('pg-query-stream'),
    d3 = require('d3'),
    fs = require('fs'),
    Canvas = require('canvas');


var width = argv.w,
    height = argv.h,
    extent = [[-180, -85], [180, 85]], // [sw, ne]
    canvas = new Canvas(width, height),
    ctx = canvas.getContext('2d');


// fill background
ctx.fillStyle = "rgba(44,44,44,1)";
ctx.fillRect(0, 0, width, height);


var projection = d3.geo.mercator()
    .scale(1)
    .translate([0,0]);

setScaleTranslate(width, height, extent, projection);

drawExtent(extent);

/* Load & draw points */
// set point color
ctx.fillStyle = "rgba(255,255,255,.1)";

// stream
var counter = 0;
var startTime,endTime;
pg.connect(argv.conn, function(err, client, done) {
    if(err) throw err;
    var stream = new QueryStream(argv.query);
    var query = client.query(stream);

    stream.on('readable', function() {
        var res = stream.read();
        counter++;

        if (res.hasOwnProperty('time')) {
            if(!startTime) startTime = res.time;
            endTime = res.time;
        }

        drawPoint(res);
    });

    stream.on('end', function(){
        client.end();

        console.log("Processed -> ", counter);
        console.log("Start / End -> ", startTime, endTime);

        savePNG();
    });
});


/*
var client = new pg.Client(PG_CONN);
client.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  client.query('select ST_X(latlon) as lng, ST_Y(latlon) as lat, time from messages where latlon is not null order by time desc limit 100000', function(err, result) {
    if(err) {
      return console.error('error running query', err);
    }
    if (result && result.rows && result.rows.length) drawPoints(result.rows);


    client.end();
  });
});
*/

function drawExtent(extent) {

    var sw = projection(extent[0]),
        ne = projection(extent[1]),
        left = sw[0],
        top = ne[1],
        right = ne[0],
        bottom = sw[1];

    ctx.lineStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();

    ctx.moveTo(left, 0);
    ctx.lineTo(left, height);

    ctx.moveTo(right, 0);
    ctx.lineTo(right, height);

    ctx.moveTo(0, top);
    ctx.lineTo(width, top);

    ctx.moveTo(0, bottom);
    ctx.lineTo(width, bottom);

    ctx.closePath();
    ctx.stroke();
}

// only tested for mercator
function setScaleTranslate(width, height, extent, projection) {
    var sw = projection(extent[0]),
        ne = projection(extent[1]),
        left = sw[0],
        top = ne[1],
        right = ne[0],
        bottom = sw[1],
        pixelBounds = [[left, bottom], [right, top]],
        scale = .95 / Math.max((pixelBounds[1][0] - pixelBounds[0][0]) / width, (pixelBounds[1][1] - pixelBounds[0][1]) / height),
        translate = [(width - scale * (pixelBounds[1][0] + pixelBounds[0][0])) / 2, (height - scale * (pixelBounds[1][1] + pixelBounds[0][1])) / 2];

    projection.scale(scale).translate(translate);
}

function drawPoint(pt) {
    var px = projection([pt.lng, pt.lat]);
    ctx.fillRect(px[0], px[1], 1, 1);
}

function drawPoints(points) {

    points.forEach(function(pt){
        var px = projection([pt.lng, pt.lat]);
        ctx.fillRect(px[0], px[1], 1, 1);
    });

}

function savePNG() {
    var out = fs.createWriteStream(__dirname + '/test.png');

    var stream = canvas.pngStream();

    stream.on('data', function(chunk){
      out.write(chunk);
    });

    stream.on('end', function(){
      console.log('saved png');
    });
}

