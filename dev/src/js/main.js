/* ==========  Third party (included with rigger)  ========== */
//= ../../node_modules/jquery/dist/jquery.min.js
//= vendor/slick.min.js
//= vendor/text-shuffle.js
//= partials/jokes.js
//= partials/stalker-names.js

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    // for web dev use 'DOMContentLoaded'
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        readyMf();
    }
};

var current_theme = 'light';

var map_light = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png';
var map_dark = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png';
var current_theme_map = map_light;
if (localStorage.getItem("active_theme") === 'light' || (current_theme === 'light' && localStorage.getItem("active_theme") === null)) {
  current_theme_map = map_light;
} else {
  current_theme_map = map_dark;
}

function setTheme() {
  localStorage.setItem("active_theme", current_theme);
}
function updateTheme() {
  current_theme = localStorage.getItem("active_theme");
  $(document.body).attr('data-theme', current_theme);
}

var home_map, home_map_offline_layer;

function readyMf() {

  updateTheme();

  // GENERAL
  // cordova open external links in system web browser
  $("a[target='_blank']").click(function(e){
    e.preventDefault();
    window.open($(e.currentTarget).attr('href'), '_system', '');
  });

  // LOAD PAGES
  $(".nav__item").on('click', function() {
    const data_page = $(this).data("page");
    const isActive = $(this).hasClass("active");
    if (data_page && !isActive) {
      $(this).addClass('active').siblings().removeClass('active');
      if (data_page === "home") {
        $(".page").removeClass("visible");
      } else {
        $("#page").load("pages/"+data_page+".html");
        $(".page").addClass("visible");
      }
    }
    return;
  });

  // MAP INIT
  home_map = L.map('map', {
    preferCanvas: true,
    center: [51.3052944, 30.0659306],
    zoom: 10,
    minZoom: 8,
    maxZoom: 18,
    attributionControl: false,
    zoomControl: false,
    measureControl: true
  });
  // add 1 layer
  L.tileLayer(current_theme_map).addTo(home_map);
  // add 2 layer
  //L.tileLayer('https://m1.land.gov.ua/map/ortho10k_all/{z}/{x}/{-y}.jpg',{maxNativeZoom: 16}).addTo(home_map);
  // add 3 layer
  home_map_offline_layer = L.tileLayerCordova('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    folder: 'StalkerPDA',
    name:   'offline_tiles',
    debug:   false
  });
  if ( localStorage.getItem("map_offline_tile") === "yes" && localStorage.getItem("map_offline_tile_url") !== null ) {
    L.tileLayer(localStorage.getItem("map_offline_tile_url"),{maxNativeZoom: 16}).addTo(home_map);
  }

  // register custom marker icon
  var current_loc_marker_icon = L.icon({
    iconUrl: 'img/marker.png',
    iconSize:     [32, 32], // size of the icon
    iconAnchor:   [16, 32], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, -32] // point from which the popup should open relative to the iconAnchor
  });

  // MAP GEOLOCATION
  var audio_pda_geo = document.createElement('audio');
  audio_pda_geo.setAttribute('src', 'audio/pda_news.ogg');

  var current_position, current_accuracy;
  function geolocateMe() {
    $("#geolocation-btn .btn-icon").addClass("active");
    var onLocationFound = function(position) {
      var lat_lng = [position.coords.latitude,position.coords.longitude];
      var accuracy = position.coords.accuracy;
      // if position defined, then remove the existing position marker and accuracy circle from the map
      if (current_position) {
          home_map.removeLayer(current_position);
          home_map.removeLayer(current_accuracy);
      }
      var radius = Math.round(accuracy / 2);
      current_position = L.marker(lat_lng, {icon: current_loc_marker_icon}).addTo(home_map)
        .bindPopup("Вы находитесь в радиусе " + radius + " м от центра круга");
      home_map.flyTo(lat_lng, 18);
      current_accuracy = L.circle(lat_lng, radius).addTo(home_map);
      current_position.openPopup();
      $("#geolocation-btn .btn-icon").removeClass("active");
      if (current_theme === 'stalker') {
        audio_pda_geo.play();
      }
    };
    function onLocationError(error) {
        navigator.notification.alert(
          error.message,  // message
          null, // callback
          'Ошибка',  // title
          'Ок'  // buttonName
        );
        $("#geolocation-btn .btn-icon").removeClass("active");
    }
    navigator.geolocation.getCurrentPosition(onLocationFound, onLocationError, {maximumAge: 30000,enableHighAccuracy:true});
  }
  $("#geolocation-btn").on("click", function() {
    navigator.geolocation.activator.askActivation(function(response) {
      geolocateMe();
    }, function(response) {
      navigator.notification.alert(
        'Для этой функции необходимо разрешить и включить GPS!',  // message
        null, // callback
        'Внимание',  // title
        'Ок'  // buttonName
      );
    });
  });

  // MAP RULER
  $("#ruler-btn").on("click", function() {
    if (home_map.measureControl.handler.enabled()) {
      home_map.measureControl.handler.disable.call(home_map.measureControl.handler);
      $("#ruler-btn .btn-icon").removeClass("active");
    } else {
      home_map.measureControl.handler.enable.call(home_map.measureControl.handler);
      $("#ruler-btn .btn-icon").addClass("active");
    }
  });

  // Instantiate KMZ layer (async)
  var kmz = L.kmzLayer().addTo(home_map);
  kmz.on('load', function(e) {
    control.addOverlay(e.layer, e.name);
  });
  // Add remote KMZ files as layers
  kmz.load('leaflet/objects.kmz');
  var control = L.control.layers(null, null, { collapsed:false }).addTo(home_map);

}