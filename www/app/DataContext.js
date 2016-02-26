var Conference = Conference || {};

Conference.dataContext = (function ($) {

    "use strict";


    // CG - This flag indicates whether we should be using the IndexedDB or WebSQL mechanism for local database storage.
    var useIndexedDB = false;

    var processorFunc = null;

    var DATABASE_NAME = 'conference_db';

    // Use OLD_DATABASE_VERSION when upgrading databases. It indicates
    // the version we can upgrade from. Anything older and we tell the user
    // there's a problem
    var OLD_DATABASE_VERSION = "0";
    // The current database version supported by this script
    var DATABASE_VERSION = "1.0";

    var errorDB = function (err) {
        console.error("Error processing database: " + err.message);
    }

    var init = function () {

        var indexedDBSchema = {
          'sessions': {
            'key': '_id',
            'indexes': {
              'title': false,
              'type': false,
              'dayId': false
            }
          },
          'venues': {
            'key': '_id',
            'indexes': {
              'name': false
            }
          }
        }

        var webSQLDBSchema = {
          'sessions': {
            'columns': {
              '_id': {
                'type': 'integer',
                'primaryKey': true,
                'autoIncrement': true
              },
              'title': {
                'type': 'text'
              },
              'startTime': 'text',
              'endTime': 'text',
              'type': 'text',
              'dayId': {
                'type': 'integer'
              },
            }
          },
          'venues': {
            'columns': {
              '_id': {
                'type': 'integer',
                'primaryKey': true,
                'autoIncrement': true
              },
              'name': 'text',
              'lat': 'text',
              'long': 'text',
            }
          }
        }

        // CG - When setting up the database, we have a couple of minor differences between the WebSQL and IndexedDB implementations that we need to consider.

        if (useIndexedDB) {

          Conference.IndexedDB.init(DATABASE_NAME, DATABASE_VERSION, indexedDBSchema, function indexedDBInitialised(isCreate) {

            if (isCreate) {

              $.getJSON( "data/data.json", function( data ) {

                Conference.IndexedDB.insertInto('sessions', data['sessions'], function() {

                  console.info("Added session data for IndexedDB.");

                }, errorDB);

                Conference.IndexedDB.insertInto('venues', data['venues'], function() {

                  console.info("Added venue data for IndexedDB.");

                }, errorDB);

              }).fail(function(err) {
                alert("Error: Unable to load data from JSON source.");
              });

            }

          }, errorDB);

        } else {

          Conference.WebSQL.init(DATABASE_NAME, OLD_DATABASE_VERSION, DATABASE_VERSION, webSQLDBSchema, function webSQLInitialised(db) {

            $.getJSON( "data/data.json", function( data ) {

              Conference.WebSQL.insertInto('sessions', data['sessions'], function() {

                console.info("Added session data for WebSQL.");

              }, errorDB);

              Conference.WebSQL.insertInto('venues', data['venues'], function() {

                console.info("Added venue data for WebSQL.");

              }, errorDB);

            }).fail(function() {
              alert("Error: Unable to load data from JSON source.");
            });

          }, errorDB);

        }

    };

    var getVenues = function(resultsCallback) {

      var indexedDBQuery = {

        'venues': {
          'index': 'name'
        }

      }

      var webSQLQuery = {

        'venues': {
          'columns': '*'
        }

      }

      if (useIndexedDB) {

        Conference.IndexedDB.selectQuery(indexedDBQuery, function(results) {

          if (typeof resultsCallback === "function") {
            resultsCallback(results);
          }

        }, errorDB);

      } else {

        Conference.WebSQL.selectQuery(webSQLQuery, function(results) {

          if (typeof resultsCallback === "function") {
            resultsCallback(results);
          }

        }, errorDB);


      }

    }

    var getSessions = function(processorFuncCallback) {

      var indexedDBQuery = {

        'sessions': {
          'index': 'dayId',
          'equals': 1
        }

      }

      var webSQLQuery = {

        'sessions': {
          'criteria': 'dayId = 1',
          'columns': '*'
        }

      }

      if (useIndexedDB) {

        Conference.IndexedDB.selectQuery(indexedDBQuery, function(results) {

          if (typeof processorFuncCallback === "function") {
            processorFuncCallback(results);
          }

        }, errorDB);


      } else {

        Conference.WebSQL.selectQuery(webSQLQuery, function(results) {

          if (typeof processorFuncCallback === "function") {
            processorFuncCallback(results);
          }

        }, errorDB);

      }

    }

    // Called by Controller.js onPageChange method
    var processSessionsList = function (processor) {

        processorFunc = processor;
        getSessions(processorFunc);

    };

    // The methods we're publishing to other JS files
    var pub = {
        init:init,
        getVenues: getVenues,
        processSessionsList:processSessionsList  // Called by Controller.js
    };

    return pub;

}(jQuery));
