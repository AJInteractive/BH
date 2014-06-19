///////////////////////////////////////////////////////////////////////////////////////////
// Settings

var mapSettings = {
    center: [8.733077421211577, 8.580322265624998],
    zoom: 6,
    maxZoom: 8,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: false // we show attribution data in the footer
};

var defaultStyle = {
    color: '#ff7800',
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.1,
    fillColor: '#ff0000'
};

///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////
// let there be globals
var map, tiles, shapes, data, Command;

///////////////////////////////////////////////////////////////////////////////////////////
// setup base map
map = L.map('map', mapSettings);

tiles = L.tileLayer.provider('Esri.WorldTopoMap');
tiles.addTo(map);

//show attribution data in the footer
$('footer small span').html(tiles.getAttribution());

shapes = L.geoJson(null, {
    style: defaultStyle 
});
shapes.addTo(map);

///////////////////////////////////////////////////////////////////////////////////////////
// queue loading of JS.Command, 3 CSV files and shapes
queue()
    .defer(function (module, callback) {
        JS.require(module, function(Module) {
            callback(null, Module);
        });
    }, 'JS.Command')
    .defer(d3.csv, 
        'data/Boko Haram Test data longs latts - Sheet1.csv', 
        function (d) {
            // normalise field names
            return {
                date: new Date(d.Date),
                lng: parseFloat(d.Lng),
                lat: parseFloat(d.Lat),
                killed: isNaN(parseInt(d.Deaths))?0:parseInt(d.Deaths),
                injured: isNaN(parseInt(d.Injured))?0:parseInt(d.Injured),
                location: d.Location,
                desc: d['Attack type'],
                type: 'attack'
            }
        })
    .defer(d3.csv, 
        'data/Boko Haram Timeline - Timeline.csv', 
        function (d) {
            // normalise field names
            return {
                date: new Date(d.Date),
                desc: d.Event,
                important: d.Red,
                type: 'event'
            }
        })
    .defer(d3.csv, 
        'data/Displacement - Boko Haram - IDP-CLEAN.csv', 
        function (d) {
            // normalise field names
            return {
                date: new Date(d.Date),
                from: d.From,
                to: d.To,
                people: isNaN(parseInt(d.Number))?0:parseInt(d.Number),
                dType: d['Internal/External'],
                desc: d.Cause,
                type: 'displ'
            }
        })
    .defer(function(callback){
        var _shapes = omnivore.topojson('data/NGA_adm1-topo.json', null, shapes)
            .on('ready', function() {
                _shapes.eachLayer(function(layer) {
                    // console.log(layer.feature.properties);
                    layer.bindPopup(layer.feature.properties.NAME_1);
                });
            });
        callback(null, _shapes);
    })
    .await(function(error, _Command, data1, data2, data3, _shapes) {
        if (error) return console.err(error);

        // globals
        Command = _Command;

        // merge data and sort by date
        data = data1.concat(data2).concat(data3);
        data.sort(function(a,b){
            return a.date.getTime() - b.date.getTime();
        });

        process();
    });



















//// !!!!!

//Create custom command, pass args in init, keep exec/undo with no param... think Prevayler.

//!!!!!

// var someCounter = 0;
// var incrementCounter;
//         incrementCounter = new Command({
//             execute: function() {
//                 someCounter += 1;
//             },
//             undo: function() {
//                 someCounter -= 1;
//             }
//         });









// var markerLayers = new L.LayerGroup();

// map.addLayer(markerLayers);

// L.control.layers({
//     "shapeLayer": shapeLayer,
//     "markers": markerLayers
// }).addTo(map);



// d3.csv('data/satpdatadates.csv', function(data) {
//     for (var i = 0; i < data.length; i++) {
//         var lat = data[i].Lat;
//         var lng = data[i].Long;

//         if (!lat || !lng) continue;

//         var latlng = L.latLng(parseFloat(lat), parseFloat(lng));

//         var marker = L.marker(latlng, {
//             title: data[i].Killed
//         }).addTo(markerLayers);
//         marker.bindPopup(data[i].Incident);

//         heat.addLatLng(latlng);

//     }
// });



function process() {
    console.log('Rows ', data.length);
    console.log('First row', data[0]);
    console.log('Last row', data[data.length - 1]);

    var $timeline = $('#timeline');

    var start = data[0].date.getTime();

    var bottom = 350; //top padding

    for (i = 0; i < data.length; i++) {

        var timestamp = null;
        if (i == 0) {
            timestamp = data[0].date.getYear() + 1900;
        } else if (data[i].date.getYear() != data[i - 1].date.getYear()) {
            timestamp = data[i].date.getYear() + 1900;
        }

        var $event = $('<div></div>').attr('id', 'A' + i);

        // default spacing: 10px per day
        var top = 10*(data[i].date.getTime() - start)/(1000*3600*24);

        // don't overlap the previous event, add minimum space
        if (top < bottom) top = bottom + 10;

        // compress space
        if (top - bottom > 300) top = bottom + 300;

        $event
            .data({
                lat: data[i].lat,
                lng: data[i].lng,
                index: i
            })
            .addClass(data[i].type)
            .html( 
                (timestamp?'<h6>' + timestamp + '</h6>' : '')
                + '<time>' 
                // + data[i].date.toISOString().split('T')[0] 
                + data[i].date.toString('MMMM dS') 
                + '</time>'
                + '<span>' 
                + data[i].desc 
                + '</span>')
            .css({
                position: 'absolute',
                top: top,
                // width: '500px',
                zIndex: i
            })
            .appendTo($timeline)
            .on('hover', function() {
                if ($(this).data('lng') && $(this).data('lat')) {
                    console.log($(this).data('lat'), $(this).data('lng'));
                    // map.setView(L.latLng($(this).data('lat'), $(this).data('lng')));
                    // redrawHeatmap(data.slice(0, $(this).data('index')));
                }
            });

        // compute next space    
        bottom = top + $event.height();
    }

    // set timeline height, plus padding
    $timeline.css('height', bottom + 50);
}





