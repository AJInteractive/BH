///////////////////////////////////////////////////////////////////////////////////////////
// Settings

var mapSettings = {
    center: [8.483238563913513, 4.954833984374999],
    zoom: 6,
    maxZoom: 8,
    // dragging: false,
    touchZoom: false,
    // doubleClickZoom: false,
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

var fromStyle = {
    color: '#ff0000',
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.8,
    fillColor: '#ff0000'
};

var toStyle = {
    color: '#00ff00',
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.8,
    fillColor: '#00ff00'
};


///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////


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

var getShapeByName = function (name) {
  for (sid in shapes._layers) {
    if (shapes._layers[sid].feature.properties.NAME_1 == name) return shapes._layers[sid];
  }

  return {
    setStyle: function(){} //dummy
  };
}

var setStyleOnEach = function (name, style) {
  var tokens = name.trim().split(/[,\s]/);
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i] != "") {
      getShapeByName(tokens[i]).setStyle(style);
    }
  }
}

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
                dType: d['Internal/External'].toLowerCase(),
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


function process() {
    console.log('Rows ', data.length);
    console.log('First row', data[0]);
    console.log('Last row', data[data.length - 1]);

    var $timeline = $('#timeline');

    var start = data[0].date.getTime();

    var bottom = 0;//350; //aka top padding

    for (i = 0; i < data.length; i++) {

        var timestamp = null;
        if (i == 0) {
            timestamp = data[0].date.getYear() + 1900;
        } else if (data[i].date.getYear() != data[i - 1].date.getYear()) {
            timestamp = data[i].date.getYear() + 1900;
        }

        var sameMonth = (i > 0 && data[i].date.toString('MMMM') == data[i-1].date.toString('MMMM'));
        var sameDate = (i > 0 && data[i].date.toString() == data[i-1].date.toString());

        // default spacing: 10px per day
        var top = 10*(data[i].date.getTime() - start)/(1000*3600*24);

        // don't overlap the previous event, add minimum space
        if (top < bottom && sameDate) {
          top = bottom + 10;
        } else if (top < bottom) {
          top = bottom + 20;
        }

        // compress space
        if (top - bottom > 300) top = bottom + 300;


        var $event = $(_.template($('#' + data[i].type).html(),
              {
                id: 'A' + i,
                year: timestamp,
                month: data[i].date.toString('MMMM'),
                sameMonth: sameMonth,
                sameDate: sameDate,
                day: data[i].date.toString('dS').replace('th', '<sup>th</sup>').replace('nd', '<sup>nd</sup>').replace('st', '<sup>st</sup>'),
                description: data[i].desc,
                from: data[i].from,
                to: data[i].to,
                dType: data[i].dType,
                injured: data[i].injured,
                killed: data[i].killed,
                location: data[i].location
              }
            ))
            .data({
                lat: data[i].lat,
                lng: data[i].lng,
                index: i,
                description: data[i].desc,
                from: data[i].from,
                to: data[i].to
            })
            .css({
                position: 'absolute',
                top: top,
                zIndex: i
            })
            .appendTo($timeline)
            .waypoint(function(direction) {

              if ($(this).data('from') || $(this).data('to')) {
                $('.highlight').removeClass('highlight');
                $(this).addClass('highlight');

                if (direction == 'down') {
                  // getShapeByName($(this).data('from')).setStyle(fromStyle);
                  setStyleOnEach($(this).data('from'), fromStyle);
                  // getShapeByName($(this).data('to')).setStyle(toStyle);
                  setStyleOnEach($(this).data('to'), toStyle);
                } else {
                  // getShapeByName($(this).data('from')).setStyle(defaultStyle);
                  // getShapeByName($(this).data('to')).setStyle(defaultStyle);
                  setStyleOnEach($(this).data('from'), defaultStyle);
                  setStyleOnEach($(this).data('to'), defaultStyle);
                }
              }

              if ($(this).data('lng') && $(this).data('lat')) {

                    $('.highlight').removeClass('highlight');
                    $(this).addClass('highlight');

                    var latlng = L.latLng($(this).data('lat'), $(this).data('lng'));

                    if (! $(this).data('marker')) {
                      var marker = L.marker(latlng, {
                          // title: data[i].Killed
                          riseOnHover: true
                      }).addTo(map);

                      marker.bindPopup($(this).data('description'));
                      marker.openPopup();

                      $(this).data('marker', marker);
                    } else if (direction == 'down') {
                      $(this).data('marker').addTo(map);
                      $(this).data('marker').openPopup();
                    }

                    if (direction == 'up' && $(this).data('marker')) {
                      // $(this).data('marker').removeFrom(map);
                      map.removeLayer($(this).data('marker'));
                      $(this).data('marker').openPopup();
                    }
                }
            }, { offset: '50%' })
            .on('click', function() {
                if ($(this).data('lng') && $(this).data('lat')) {

                    $('.highlight').removeClass('highlight');
                    $(this).addClass('highlight');

                    var latlng = L.latLng($(this).data('lat'), $(this).data('lng'));

                    if (! $(this).data('marker')) {
                      var marker = L.marker(latlng, {
                          // title: data[i].Killed
                          riseOnHover: true
                      }).addTo(map);

                      marker.bindPopup($(this).data('description'));
                      marker.openPopup();

                      $(this).data('marker', marker);
                    } else {
                      $(this).data('marker').openPopup();
                    }
                }
            });

        // compute next space
        bottom = top + $event.height();
    }

    // set timeline height, plus padding
    $timeline.css('height', bottom + 50);
}





