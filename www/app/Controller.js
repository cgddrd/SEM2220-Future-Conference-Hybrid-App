var Conference = Conference || {};

Conference.controller = (function($, dataContext, document) {

  "use strict";

  var position = null;
  var mapDisplayed = false;
  var currentMapWidth = 0;
  var currentMapHeight = 0;

  var sessionsListContainerSelector = "#sessions-list-content";
  var sessionsListSelector = "#sessions-list-view";

  var noSessionsCachedMsg = "<div>Your sessions list is empty.</div>";
  var databaseNotInitialisedMsg = "<div>Your browser does not support local databases.</div>";

  var sessionItemTemplate = '<li><a href=""><div class="session-list-item"><h3>%title%</h3><div><h6>%type%</h6><h6>%start-time% to %end-time%</h6></div></div></li>';

  var hasTriggeredPageChangeError = false;

  /*
   * CG - Fixed bug whereby variable 'sList' was undefined.
   *
   * This variable should be set to reference the function associated with rendering out the list of session
   * results returned from the Web SQL database query in 'dataContext.querySessions'.
   */
  var sList = renderSessionsList;

  var TECHNICAL_SESSION = "Technical",
    SESSIONS_LIST_PAGE_ID = "sessions",
    MAP_PAGE = "map";

  // This changes the behaviour of the anchor <a> link§
  // so that when we click an anchor link we change page without
  // updating the browser's history stack (changeHash: false).
  // We also don't want the usual page transition effect but
  // rather to have no transition (i.e. tabbed behaviour)
  var initialisePage = function(event) {

    // CG - This function has now been replaced by the 'setup_root_page_detection' function.
    //change_page_back_history();

    // CG - Setup event listener to check for root url redirects and configure jQM back history (exisiting functionality).
    setup_root_page_detection();

  };

  var onPageChange = function(event, data) {

    // CG - When we go to change to another page, make sure we reset the error trigger flag in order to display the error message is required.
    hasTriggeredPageChangeError = false;

    try {

      // Find the id of the page
      var toPageId = data.toPage.attr("id");

      // If we're about to display the map tab (page) then
      // if not already displayed then display, else if
      // displayed and window dimensions changed then redisplay
      // with new dimensions
      switch (toPageId) {
        case SESSIONS_LIST_PAGE_ID:

          // CG - Use of the common wrapper between WebSQL and IndexedDB allows us to render the results in the same way regardless.
          dataContext.processSessionsList(renderSessionsList);
          break;

        case MAP_PAGE:
          if (!mapDisplayed || (currentMapWidth != get_map_width() ||
              currentMapHeight != get_map_height())) {
            deal_with_geolocation();
          }
          break;
      }

    } catch (error) {

      alert("Error whilst changing view: " + error.message);

    }

    return false;

  };


  /*
   * CG - Fixed bug to ensure definition for the WebSQL 'executeSql' callback function correctly matches the W3C specification
   * as specified here: https://www.w3.org/TR/webdatabase/#executing-sql-statements
   *
   * This was a minor change to the orignal code, simply requiring an additional parameter to the added in order to represent
   * both the SQLTransaction and SQLResultSet (i.e. the returned list of query results) objects.
   */
  var renderSessionsList = function(sessionsList) {

    // This is where you do the work to build the HTML ul list
    // based on the data you've received from DataContext.js (it
    // calls this method with the list of data)
    // Here are some things you need to do:
    // o Obtain a reference to #sessions-list-content element
    // o If the sessionsList is empty append a div with an error message to the page
    // o Create the <ul> element using jQuery commands and append to the sessions section
    // o Loop through the sessionsList data building up an appropriate set of <li>
    // elements. See how we do this in the worksheet version that hard-codes the
    // session data in index.html
    // o Append the list items to the <ul> element created earlier. Hint: building
    // up an array and then converting to a string with join before appending
    // would help.
    // o You will need to refresh JQM by calling listview function
    // **ENTER CODE HERE**

    var sessionListContainer = $(sessionsListContainerSelector);
    var sessionListView = $(sessionsListSelector);

    sessionListView.empty();

    if (sessionsList.length <= 0) {

      $(noSessionsCachedMsg).appendTo(sessionListContainer);

    } else {

      var listArray = [];

      // CG - Cache the termination value inside of the loop - more efficient.
      for (var i = 0, len = sessionsList.length; i < len; i++) {

        var compiledTemplate = compileTemplate(sessionItemTemplate, ['%title%', '%type%', '%start-time%', '%end-time%'], [sessionsList[i].title, sessionsList[i].type,
            sessionsList[i].startTime, sessionsList[i].endTime
          ],
          'gi');

        listArray.push(compiledTemplate);

      }

      $(listArray.join('')).appendTo(sessionListView);

      // CG - Check if the JQM listview object has already been initialised or not. If so, just refresh the existing list.
      // See: http://stackoverflow.com/a/9493671 for more information.
      if ($(sessionListView).hasClass('ui-listview')) {

        $(sessionListView).listview('refresh');

      } else {

        $(sessionListView).listview();

      }

    }

  };

  var compileTemplate = function(targetString, findTerms, replaceTerms, regexFlags) {

    if (findTerms.length !== replaceTerms.length) {
      throw new Error("Number of supplied Regex search terms must match number of replacement terms.");
    }

    regexFlags = regexFlags || '';

    var lookupTable = {};

    for (var i = 0; i < findTerms.length; i++) {

      lookupTable[findTerms[i]] = replaceTerms[i];

    }

    var regex = new RegExp(findTerms.length > 1 ? findTerms.join('|') : findTerms[0], regexFlags);

    return targetString.replace(regex, function(matched) {
      return lookupTable[matched];
    });

  }

  var noDataDisplay = function(event, data) {
    var view = $(sessionsListSelector);
    view.empty();
    $(databaseNotInitialisedMsg).appendTo(view);
  }


  // CG - Provides a common function for specifing manual triggering and customisation of page redirects.
  var jqmAjaxPageRedirect = function(pageHref) {

    $.mobile.changePage(pageHref, { // Go to the URL
      transition: "none",
      changeHash: false
    });

    return false;

  }

  var change_page_back_history = function() {

    // CG - This function has now been replaced by the 'setup_root_page_detection' function.

  };

  // CG - Add listener to auto-redirect to first page (default homepage for JQM) if anchor 'href' is set to root '/' character.
  var setup_root_page_detection = function() {

    $('a').on('click', function() {

      try {

        // CG - We are specifically looking for the single '/' character, which normally would redirect to the server root (causes JQM to fall over).
        if ($(this).attr("href") === '/') {

          // CG - Find the ID of the first JQM page and navigate to there. (Default behaviour of JQM on startup anyway).
          if ($('div[data-role="page"]').first().attr('id')) {

            return jqmAjaxPageRedirect('#' + $('div[data-role="page"]').first().attr('id'));

          } else {
            throw Error("Unable to redirect to homepage - no ID found.");
          }

        } else {

          // CG - Note we are now using our 'generic' function for initiating a page transition in JQM.
          return jqmAjaxPageRedirect($(this).attr("href"));

        }


      } catch (error) {

        alert("Navigation Error: " + error);

      }

    });

  }

  var deal_with_geolocation = function() {
    var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1);
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
      // Running on a mobile. Will have to add to this list for other mobiles.
      // We need the above because the deviceready event is a phonegap event and
      // if we have access to PhoneGap we want to wait until it is ready before
      // initialising geolocation services
      if (phoneGapApp) {
        //alert('Running as PhoneGapp app');
        document.addEventListener("deviceready", initiate_geolocation, false);
      } else {
        initiate_geolocation(); // Directly from the mobile browser
      }
    } else {
      //alert('Running as desktop browser app');
      initiate_geolocation(); // Directly from the browser
    }
  };

  var initiate_geolocation = function() {

    // Do we have built-in support for geolocation (either native browser or phonegap)?
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors);
    } else {
      // We don't so let's try a polyfill
      yqlgeo.get('visitor', normalize_yql_response);
    }
  };

  var handle_errors = function(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        alert("user did not share geolocation data");
        break;

      case error.POSITION_UNAVAILABLE:
        alert("could not detect current position");
        break;

      case error.TIMEOUT:
        alert("retrieving position timed out");
        break;

      default:
        alert("unknown error");
        break;
    }
  };

  var normalize_yql_response = function(response) {
    if (response.error) {
      var error = {
        code: 0
      };
      handle_errors(error);
      return;
    }

    position = {
      coords: {
        latitude: response.place.centroid.latitude,
        longitude: response.place.centroid.longitude
      },
      address: {
        city: response.place.locality2.content,
        region: response.place.admin1.content,
        country: response.place.country.content
      }
    };

    handle_geolocation_query(position);
  };

  var get_map_height = function() {
    return $(window).height() - ($('#maptitle').height() + $('#mapfooter').height());
  }

  var get_map_width = function() {
    return $(window).width();
  }

  var handle_geolocation_query = function(pos) {

    console.log("map init");

    position = pos;

    var the_height = get_map_height();
    var the_width = get_map_width();

    // CG - Define the collection of colours we can use for pointer images.
    var markerColours = ['red', 'green', 'blue', 'yellow', 'orange', 'pink', 'ltblue', 'purple'];
    var markerColoursIndex = 0;

    // CG - Replaced the static map image with an interactive Google Maps API component.

    // var image_url = "http://maps.google.com/maps/api/staticmap?sensor=false&center=" + position.coords.latitude + "," +
    //   position.coords.longitude + "&zoom=14&size=" +
    //   the_width + "x" + the_height + "&markers=color:blue|label:S|" +
    //   position.coords.latitude + ',' + position.coords.longitude;
    //$('#map-img').remove();
    // jQuery('<img/>', {
    //   id: 'map-img',
    //   src: image_url,
    //   title: 'Google map of my location'
    // }).appendTo('#mapPos');

    // CG - Setup the correct height of the Google Maps widget to fit the available space.
    var id = $.mobile.activePage.attr('id');

    console.log(id);

    $('#' + id + " .ui-content").height(get_map_height());
    $('map-widget').height(get_map_height());

    // CG - Make use of the exisiting lat/long coords to display position on interactive map widget.
    var myLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    var map = new google.maps.Map(document.getElementById('map-widget'), {
      center: myLatlng,
      zoom: 14,

      // CG - Disable all 'standard' Google Maps API controls.
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false
    });

    // CG - Place a marker in the location of the user.
    var positionMarker = new google.maps.Marker({
      position: myLatlng,
      animation: google.maps.Animation.DROP
    });

    positionMarker.setMap(map);


    // CG - Loop through the venues stored in the database, and place a different coloured marker on the map widget for each.
    dataContext.getVenues(function(results) {

      var marker;

      for (var i = 0, len = results.length; i < len; i++) {

        marker = new google.maps.Marker({
          position: new google.maps.LatLng(results[i]['lat'], results[i]['long']),
          animation: google.maps.Animation.DROP,
          title: results[i]['name'],

          // CG - Loop through potential marker colour images.
          // Based on example from: https://developers.google.com/maps/documentation/javascript/markers#marker_labels
          icon: 'http://maps.google.com/mapfiles/ms/icons/' + markerColours[markerColoursIndex++ % markerColours.length] + '-dot.png'
        });

        marker.setMap(map);

      }

    });

    mapDisplayed = true;

  };

  var init = function() {

    // The pagechange event is fired every time we switch pages or display a page
    // for the first time.
    var d = $(document);
    var databaseInitialised = dataContext.init();
    if (!databaseInitialised) {
      d.on('pagechange', $(document), noDataDisplay);
    }

    // CG - This event fires PRIOR to attempting to change this page. This allows us to catch any errors on page change events that could break JQM.
    // CG - Also updated now-deprecated 'pagebeforechange' event name to use new callback on pagecontainer widget. See: https://api.jquerymobile.com/pagebeforechange/
    d.on('pagecontainerbeforechange', $(document), function(e, data) {

      if (typeof data === "undefined" || typeof data.toPage === "undefined") {

        /*
         * CG - If we click a link/button/tab to another page with an empty or missing 'href' attribute, log the error
         * but prevent JQM from falling over.
         */

         // CG - As 'pagecontainerbeforechange' is triggered TWICE during the page change process (See: https://api.jquerymobile.com/pagecontainer/#event-beforechange)
         // we need to use a flag to make sure we only display the error message ONCE per page change action.
         if (!hasTriggeredPageChangeError) {
             alert("Error whilst changing page: Target page does not exist.");

             // CG - Set the flag to true to make sure we don't display the error message again on the SECOND call to 'pagecontainerbeforechange' that occurs.
             hasTriggeredPageChangeError = true;
         }

        return false;

      }

    });

    // CG - Issue with 'pagechange' event - this appears to re-bind inside the exisiting 'pagechange' event handler for previously-loaded pages.
    // Observed pattern: For each NEW page loaded for the first time, a new 'recursive' binding of 'pagechange' takes place.
    d.on('pagebeforeshow', $(document), onPageChange);

    // The pageinit event is fired when jQM loads a new page for the first time into the
    // Document Object Model (DOM). When this happens we want the initialisePage function
    // to be called.

    // CG - Changed now-deprecated event 'pageinit' to new 'pagecreate' handler.
    d.on('pagecreate', $(document), initialisePage);

  };


  // Provides a hash of functions that we return to external code so that they
  // know which functions they can call. In this case just init.
  var pub = {
    init: init
  };

  return pub;

}(jQuery, Conference.dataContext, document));


/*
 * CG - Here we are using a Proxy-style pattern to effectively 'override' the native JS 'alert' function.
 * We do this to allow use of the native iOS and Android alert dialogs for JS 'alert' calls when running as a Phonegap application.
 *
 * We check to see if the Phonegap 'notification' plugin is available, if so, display a native dialog
 * otherwise, fall back to the exisiting JS dialog provided by the web view.
 *
 * See: http://api.jquery.com/Types/#Proxy_Pattern for more information
 */
(function(proxied) {
  window.alert = function() {

    // CG - If we are within the Phonegap wrapper and we have access to the 'notification' plugin, use native popup dialogs.
    if (navigator.notification && navigator.notification.alert) {

      return navigator.notification.alert(
        arguments[0], // message
        null, // Callback (no callback in this case).
        "FoWC", // Alert title
        "OK" // Button
      );

      // CG - Otherwise, use the default web view alert dialog (e.g. if we are viewing via a normal web browser).
    } else {

      // CG - Return the original proxied function (i.e. normal browser-based dialogs).
      return proxied.apply(this, arguments);

    }

  };

})(window.alert);

// Called when jQuery Mobile is loaded and ready to use.
$(document).on('mobileinit', $(document), function() {

  Conference.controller.init();

});
