/*
    DotsOnAMap

    # Using Postgres
    node index.js -w 5000 -h 5000 -c 'CONNECTION_STRING' \
    -q 'QUERY_STRING'

    # Using CSV
    node index.js  --csv data/sample/boxes.csv --bbox --bcolor 'rgba(255,255,255,1)' \
    --stroke 'rgba(0,0,0,0.1)' -w 4000 -h 3000 --world 'rgba(0,0,0,0.3)'




    node index.js -c africa.js
*/

var argv = require('optimist')
    .usage('Draw points & boxes on a map!')
    .alias('c', 'config')
    .demand('c')
    .describe('c', 'Config file')
    .argv;

var pg = require('pg'),
    csv = require("fast-csv"),
    hstore = require('node-postgres-hstore'),
    QueryStream = require('pg-query-stream'),
    d3 = require('d3'),
    fs = require('fs'),
    pathModule = require('path'),
    Canvas = require('canvas');

var config = require(pathModule.resolve(argv.c));

var width = config.width || 2000,
    height = config.height || 2000,
    extent = config.extent || [[-180, -85], [180, 85]], // [sw, ne]
    backgroundColor = config.background || 'rgba(255,255,255,1)',
    worldColor = config.worldColor || null,
    extentColor = config.extentColor || null,
    fillColor = config.fill || 'rgba(0,0,0,0.1)',
    strokeColor = config.stroke || 'rgba(0,0,0,0.1)',
    globalAlpha = config.alpha || 1.0,
    worldFile = config.worldFile || './data/geo/countries.geojson',
    fitToFeatures = config.fitToFeatures || false,
    imageName = config.imageName || 'test.png',
    bbox = config.bbox || false,
    canvas = new Canvas(width, height),
    ctx = canvas.getContext('2d');

var counter = 0;

var projection = d3.geo.mercator()
    .scale(1)
    .translate([0,0]);

var path = d3.geo.path()
    .projection(projection)
    .context(ctx);

// ------------------------- //
run();
// ------------------------- //

function run() {
    // scale to extent
    if (!fitToFeatures) setScaleTranslate();

    // fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (extentColor) drawExtent(extent);

    if (worldColor || fitToFeatures) {
        fs.readFile(worldFile, function(err, data) {
            if (err) throw err;
            var features = JSON.parse(data);
            if (fitToFeatures) {
                setScaleTranslateFromFeatures(features);
            }
            if(worldColor) {
                ctx.strokeStyle = worldColor;
                path(features);
                ctx.stroke();
            }
            drawInputData();
        });
    } else {
        drawInputData();
    }
}



function drawInputData() {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;

    ctx.globalAlpha = globalAlpha;
    //ctx.globalCompositeOperation = "overlay";

    if (config.csvFile) {
        processCSV(savePNG);
    } else if (config.pgConnection && config.pgQuery) {
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
    var clr;
    csv
    .fromPath(config.csvFile,{
        delimiter: '\t',
        headers: true
    })
    .on("data", function(data){
        if (typeof config.colorizer === 'function') {
            clr = config.colorizer(data);
        } else {
            clr = strokeColor;
        }
        if (bbox) {
            drawBBOX(data, clr);
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
    pg.connect(config.pgConnection, function(err, client, done) {
        if(err) throw err;
        var stream = new QueryStream(config.pgQuery);
        var query = client.query(stream);

        stream.on('readable', function() {
            var res = stream.read();
            counter++;

            if (bbox) {
                drawBBOX(res);
            } else {
                drawPoint(res);
            }
        });

        stream.on('end', function(){
            client.end();

            console.log("Processed -> ", counter);
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
    console.log(bounds);
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

function drawBBOX(data, clr) {
    var bbox = [[+data.west, +data.south], [+data.east, +data.north]];
    if(!validBBOX(bbox)) return;

    var sw = projection(bbox[0]),
        ne = projection(bbox[1]),
        left = sw[0],
        top = ne[1],
        right = ne[0],
        bottom = sw[1];

    ctx.strokeStyle = clr;
    ctx.strokeRect(left, top, Math.abs(left-right), Math.abs(top-bottom));
}

function drawExtent(extent) {
    var sw = projection(extent[0]),
        ne = projection(extent[1]),
        left = sw[0],
        top = ne[1],
        right = ne[0],
        bottom = sw[1];

    ctx.lineStyle = extentColor;
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
    var out = fs.createWriteStream(__dirname + '/' + imageName);

    var stream = canvas.pngStream();

    stream.on('data', function(chunk){
      out.write(chunk);
    });

    stream.on('end', function(){
      console.log('saved png');
    });
}

