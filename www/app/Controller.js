var Conference = Conference || {};

Conference.controller = (function ($, dataContext, document) {
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
    var initialisePage = function (event) {
        change_page_back_history();
    };

    var onPageChange = function (event, data) {

      console.log(event);
      console.log(data);

        // Find the id of the page
        var toPageId = data.toPage.attr("id");

        // If we're about to display the map tab (page) then
        // if not already displayed then display, else if
        // displayed and window dimensions changed then redisplay
        // with new dimensions
        switch (toPageId) {
            case SESSIONS_LIST_PAGE_ID:
                //dataContext.processSessionsList(sList);
                dataContext.processSessionsList(renderSessionsList);
                break;
            case MAP_PAGE:
                if (!mapDisplayed || (currentMapWidth != get_map_width() ||
                    currentMapHeight != get_map_height())) {
                    deal_with_geolocation();
                }
                break;
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
    var renderSessionsList = function (transactionData, sessionsList) {

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

        if (sessionsList.rows.length <= 0) {

          $(noSessionsCachedMsg).appendTo(sessionListContainer);

        } else {

          var listArray = [];

          // CG - Cache the termination value inside of the loop - more efficient.
          for (var i = 0, len = sessionsList.rows.length; i < len; i++) {

            var compiledTemplate = compileTemplate(sessionItemTemplate, ['%title%', '%type%', '%start-time%', '%end-time%'],
                                                                        [sessionsList.rows[i].title, sessionsList.rows[i].type,
                                                                         sessionsList.rows[i].starttime, sessionsList.rows[i].endtime],
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

          //$( "#myFilter" ).filterable().filterable('refresh');

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

      return targetString.replace(regex, function(matched){
        return lookupTable[matched];
      });

    }

    var noDataDisplay = function (event, data) {
        var view = $(sessionsListSelector);
        view.empty();
        $(databaseNotInitialisedMsg).appendTo(view);
    }

    var change_page_back_history = function () {
        $('a[data-role="tab"]').each(function () {
            var anchor = $(this);
            anchor.bind("click", function () {
                $.mobile.changePage(anchor.attr("href"), { // Go to the URL
                    transition: "none",
                    changeHash: false
                });
                return false;
            });
        });
    };

    var deal_with_geolocation = function () {
        var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 );
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            // Running on a mobile. Will have to add to this list for other mobiles.
            // We need the above because the deviceready event is a phonegap event and
            // if we have access to PhoneGap we want to wait until it is ready before
            // initialising geolocation services
            if (phoneGapApp) {
                //alert('Running as PhoneGapp app');
                document.addEventListener("deviceready", initiate_geolocation, false);
            }
            else {
                initiate_geolocation(); // Directly from the mobile browser
            }
        } else {
            //alert('Running as desktop browser app');
            initiate_geolocation(); // Directly from the browser
        }
    };

    var initiate_geolocation = function () {

        // Do we have built-in support for geolocation (either native browser or phonegap)?
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors);
        }
        else {
            // We don't so let's try a polyfill
            yqlgeo.get('visitor', normalize_yql_response);
        }
    };

    var handle_errors = function (error) {
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

    var normalize_yql_response = function (response) {
        if (response.error) {
            var error = { code: 0 };
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

    var get_map_height = function () {
        return $(window).height() - ($('#maptitle').height() + $('#mapfooter').height());
    }

    var get_map_width = function () {
        return $(window).width();
    }

    var handle_geolocation_query = function (pos) {
        position = pos;

        var the_height = get_map_height();
        var the_width = get_map_width();

        var image_url = "http://maps.google.com/maps/api/staticmap?sensor=false&center=" + position.coords.latitude + "," +
            position.coords.longitude + "&zoom=14&size=" +
            the_width + "x" + the_height + "&markers=color:blue|label:S|" +
            position.coords.latitude + ',' + position.coords.longitude;

        $('#map-img').remove();

        jQuery('<img/>', {
            id: 'map-img',
            src: image_url,
            title: 'Google map of my location'
        }).appendTo('#mapPos');

        mapDisplayed = true;
    };

    var init = function () {
        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.
        var d = $(document);
        var databaseInitialised = dataContext.init();
        if (!databaseInitialised) {
            d.on('pagechange', $(document), noDataDisplay);
        }

        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.

        // CG - Issue with 'pagechange' - this appears to re-bind inside the exisiting 'pagechange' event handler for previously-loaded pages.
        // Observed pattern: For each NEW page loaded for the first time, a new 'recursive' binding of 'pagechange' takes place.
        //d.on('pagechange', $(document), onPageChange);

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

// Called when jQuery Mobile is loaded and ready to use.
$(document).on('mobileinit', $(document), function () {
    Conference.controller.init();
});
