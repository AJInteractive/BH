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
    fillOpacity: 0.6,
    fillColor: '#ff0000'
};

var toStyle = {
    color: '#00ff00',
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.6,
    fillColor: '#00ff00'
};


///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
// let there be globals
var map, tiles, shapes, data, sheet;

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

var markerLayers = new L.LayerGroup();
map.addLayer(markerLayers);

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


queue()
    .defer(function(callback){
      Tabletop.init({
          key: '1fNmHh1m3qKvN-RSueCzcZMHaL-a1I0dPzInxI3Ei-YI',
          callback: function(_sheet, tabletop) {
              callback(null, _sheet);
          },
          simpleSheet: false
      });
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
    .await(function(error, _sheet, _shapes) {
        if (error) return console.err(error);

        sheet = _sheet;
        console.log(sheet);

        var data1 = [];
        var data2 = [];
        var data3 = [];

        //ATTACKS
        for (var i = 0; i < sheet.ATTACKS.elements.length; i++) {
          var d = sheet.ATTACKS.elements[i];
          data1.push({
            date: new Date(d.date),
            lng: parseFloat(d.lng),
            lat: parseFloat(d.lat),
            killed: isNaN(parseInt(d.deaths))?0:parseInt(d.deaths),
            injured: isNaN(parseInt(d.injured))?0:parseInt(d.injured),
            location: d.location,
            desc: d.description,
            type: 'attack'
          });
        }

        //TIMELINE
        for (var i = 0; i < sheet.TIMELINE.elements.length; i++) {
          var d = sheet.TIMELINE.elements[i];
          data2.push({
            date: new Date(d.date),
            desc: d.event,
            important: d.red,
            type: 'event'
          });
        }

        //DISPLACEMENT
        for (var i = 0; i < sheet.DISPLACEMENT.elements.length; i++) {
          var d = sheet.DISPLACEMENT.elements[i];
          data2.push({
            date: new Date(d.date),
            from: d.from,
            to: d.to,
            fromfuzzy: d.fromfuzzy,
            tofuzzy: d.tofuzzy,
            people: isNaN(parseInt(d.number))?0:parseInt(d.number),
            dType: d.internalexternal.toLowerCase(),
            desc: d.cause,
            type: 'displ'
          });
        }

        // merge data and sort by date
        data = data1.concat(data2).concat(data3);
        data.sort(function(a,b){
            return a.date.getTime() - b.date.getTime();
        });

        magic(sheet.COPY.elements);
        process();
    });

function magic(rules) {
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var $target = $(rule.selector);

    if (rule.method == 'text') {
      $target.text(rule.content);
    }

    if (rule.method == 'html') {
      $target.html(rule.content);
    }

    if (rule.method == 'prepend') {
      var $el = $(document.createElement(rule.element));
      if (rule.content) $el.html(rule.content);
      $target.prepend($el);
    }

    if (rule.method == 'append') {
      var $el = $(document.createElement(rule.element));
      if (rule.content) $el.html(rule.content);
      $target.append($el);
    }

  }

  // $('header').css('height', $('.rest').height());
}

$(window).bind('resize', function(e) {
    window.resizeEvt;
    $(window).resize(function() {
        clearTimeout(window.resizeEvt);
        window.resizeEvt = setTimeout(function() {
            reset();
            process();
            // $('header').css('height', $('.rest').height());
        }, 250);
    });
});

function reset() {
  markerLayers.clearLayers();
  $('#timeline').empty();
}



function process() {
    // console.log('Rows ', data.length);
    // console.log('First row', data[0]);
    // console.log('Last row', data[data.length - 1]);

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
                fromfuzzy: data[i].fromfuzzy,
                tofuzzy: data[i].tofuzzy,
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
                to: data[i].to,
                injured: data[i].injured,
                killed: data[i].killed
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
                $(this).find('>div').addClass('highlight');

                if (direction == 'down') {
                  setStyleOnEach($(this).data('from'), fromStyle);
                  setStyleOnEach($(this).data('to'), toStyle);
                } else {
                  setStyleOnEach($(this).data('from'), defaultStyle);
                  setStyleOnEach($(this).data('to'), defaultStyle);
                }
              }

              if ($(this).data('lng') && $(this).data('lat')) {

                    $('.highlight').removeClass('highlight');
                    $(this).find('>div').addClass('highlight');

                    var latlng = L.latLng($(this).data('lat'), $(this).data('lng'));

                    if (! $(this).data('marker')) {
                      var marker = L.marker(latlng, {
                          riseOnHover: true
                      });

                      marker.setIcon(L.icon({
                          "iconUrl": "img/attack.png",
                          "iconSize": [22, 22],   // size of the icon
                          "iconAnchor": [11, 11], // point of the icon which will correspond to marker's location
                          "popupAnchor": [0, -5], // point from which the popup should open relative to the iconAnchor
                          "className": "dot"
                      }));

                      marker.addTo(markerLayers);

                      marker.bindPopup($(this).data('description'));
                      marker.openPopup();

                      $(this).data('marker', marker);
                    } else if (direction == 'down') {
                      $(this).data('marker').addTo(markerLayers);
                      $(this).data('marker').openPopup();
                    }

                    if (direction == 'up' && $(this).data('marker')) {
                      markerLayers.removeLayer($(this).data('marker'));
                      $(this).data('marker').openPopup();
                    }
                }
            }, { offset: '50%' });

        // compute next space
        bottom = top + $event.height();
    }

    // set timeline height, plus padding
    $timeline.css('height', bottom + 50);
}

/////

$('#head-text-t1h').click(function() {
  $('header .selected').removeClass('selected');
  $(this).addClass('selected');
  $('#head-text-t1').addClass('selected');
  $('.cutout').attr('src', 'img/boko.png');
});

$('#head-text-t2h').click(function() {
  $('header .selected').removeClass('selected');
  $(this).addClass('selected');
  $('#head-text-t2').addClass('selected');
  $('.cutout').attr('src', 'img/soldier.png');
});


