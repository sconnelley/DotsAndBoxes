/*
    DotsOnAMap

    # Using Postgres
    node index.js -w 5000 -h 5000 -c 'CONNECTION_STRING' \
    -q 'QUERY_STRING'

    # Using CSV
    node index.js  --csv data/sample/boxes.csv --bbox --bcolor 'rgba(255,255,255,1)' \
    --stroke 'rgba(0,0,0,0.1)' -w 4000 -h 3000 --world 'rgba(0,0,0,0.3)'
*/

var argv = require('optimist')
    .usage('Draw points & boxes on a map!')
    .alias('c', 'conn')
    .describe('c', 'Postgres connection string')
    .alias('q', 'query')
    .describe('q', 'Postgres query string. Row objects need to contain a lat & lng property.')
    .describe('csv', 'CSV file')
    .boolean('bbox')
    .describe('bbox', 'Draw bounding boxes. Row objects must have north, west, south, east properties.')
    .default('w', 2000)
    .default('h', 2000)
    .describe('w', 'Canvas width')
    .describe('h', 'Canvas height')
    .default('bcolor', 'rgba(44,44,44,1)')
    .describe('bcolor', 'Canvas background color')
    .default('stroke', 'rgba(255,255,255,0.1)')
    .describe('stroke', 'Canvas strokeStyle')
    .default('fill', 'rgba(255,255,255,0.1)')
    .describe('fill', 'Canvas fillStyle')
    .describe('world', 'World outline strokeStyle')
    .describe('extent', 'Extent lineStyle')
    .describe('alpha', 'Canvas global alpha value for drawing input data')
    .default('alpha', 1.0)
    .argv;


var pg = require('pg'),
    csv = require("fast-csv"),
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

var counter = 0;
var startTime,endTime;
var drawWorldOutline = (argv.world) ? true : false;
var drawWorldExtent = (argv.extent) ? true : false;


var projection = d3.geo.mercator()
    .scale(1)
    .translate([0,0]);

setScaleTranslate();

var path = d3.geo.path()
    .projection(projection)
    .context(ctx);

// fill background
ctx.fillStyle = argv.bcolor;
ctx.fillRect(0, 0, width, height);

if (drawWorldExtent) drawExtent(extent);

if (drawWorldOutline) {
    fs.readFile('./data/countries.geojson', function(err, data) {
        if (err) throw err;

        ctx.strokeStyle = argv.world;
        path(JSON.parse(data));
        ctx.stroke();

        drawInputData();
    });
} else {
    drawInputData();
}

function drawInputData() {
    ctx.fillStyle = argv.fill;
    ctx.strokeStyle = argv.stroke;

    ctx.globalAlpha = argv.alpha;
    //ctx.globalCompositeOperation = "overlay";

    if (argv.csv) {
        processCSV(savePNG);
    } else if (argv.conn && argv.query) {
        processPostgres(savePNG);
    } else {
        savePNG();
    }
}

function validBBOX(bbox) {
    if (bbox[0][0] < extent[0][0]) return false;
    if (bbox[0][1] < extent[0][1]) return false;
    if (bbox[1][0] > extent[1][0]) return false;
    if (bbox[1][1] > extent[1][1]) return false;
    return true;
}

function processCSV(callback) {
    csv
    .fromPath(argv.csv,{
        delimiter: '\t',
        headers: true
    })
    .on("data", function(data){
        if (argv.bbox) {
            drawBBOX(data);
        } else {
            drawPoint(data); // must have `lat` & `lng` property
        }
        counter++;
    })
    .on("end", function(){
        console.log("Processed -> ", counter);
        callback();
    });
}

function processPostgres(callback) {
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

            if (argv.bbox) {
                drawBBOX(res);
            } else {
                drawPoint(res);
            }
        });

        stream.on('end', function(){
            client.end();

            console.log("Processed -> ", counter);
            console.log("Start / End -> ", startTime, endTime);

            callback();
        });
    });
}

function setScaleTranslate() {
    var sw = projection(extent[0]),
        ne = projection(extent[1]),
        pixelBounds = [[sw[0], sw[1]], [ne[0], ne[1]]],
        dx = pixelBounds[1][0] - pixelBounds[0][0],
        dy = pixelBounds[1][1] - pixelBounds[0][1],
        x = (pixelBounds[0][0] + pixelBounds[1][0]) / 2,
        y = (pixelBounds[0][1] + pixelBounds[1][1]) / 2,
        scale = .9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    projection.scale(scale).translate(translate);
}

function setScaleTranslateFromFeatures(features) {
    var bounds = path.bounds(features),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = .9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

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

function drawBBOX(data) {
    var bbox = [[+data.west, +data.south], [+data.east, +data.north]];
    if(!validBBOX(bbox)) return;

    var sw = projection(bbox[0]),
        ne = projection(bbox[1]),
        left = sw[0],
        top = ne[1],
        right = ne[0],
        bottom = sw[1];

    ctx.strokeRect(left, top, Math.abs(left-right), Math.abs(top-bottom));
}

function drawExtent(extent) {
    var sw = projection(extent[0]),
        ne = projection(extent[1]),
        left = sw[0],
        top = ne[1],
        right = ne[0],
        bottom = sw[1];

    ctx.lineStyle = argv.extent;
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

