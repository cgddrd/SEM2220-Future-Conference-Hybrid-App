var Conference = Conference || {};

Conference.dataContext = (function ($) {

    "use strict";

    var useIndexedDB = true;
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

        var webSQLSchema = {
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

        if (useIndexedDB) {

          Conference.indexedDB.init(DATABASE_NAME, DATABASE_VERSION, indexedDBSchema, function indexedDBInitialised(isCreate) {

            if (isCreate) {

              $.getJSON( "data/data.json", function( data ) {

                Conference.indexedDB.insertInto('sessions', data['sessions'], function() {

                  console.info("Added session data for IndexedDB.");

                }, errorDB);

                Conference.indexedDB.insertInto('venues', data['venues'], function() {

                  console.info("Added venue data for IndexedDB.");

                }, errorDB);

              }).fail(function(err) {
                alert("Error: Unable to load data from JSON source.");
              });

            }

          }, errorDB);

        } else {

          Conference.websql.init(DATABASE_NAME, OLD_DATABASE_VERSION, DATABASE_VERSION, webSQLSchema, function webSQLInitialised(db) {

            $.getJSON( "data/data.json", function( data ) {

              Conference.websql.insertInto('sessions', data['sessions'], function() {

                console.info("Added session data for WebSQL.");

              }, errorDB);

              Conference.websql.insertInto('venues', data['venues'], function() {

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

        Conference.indexedDB.selectQuery(indexedDBQuery, function(results) {

          if (typeof resultsCallback === "function") {
            resultsCallback(results);
          }

        }, errorDB);

      } else {

        Conference.websql.selectQuery(webSQLQuery, function(results) {

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

        Conference.indexedDB.selectQuery(indexedDBQuery, function(results) {

          if (typeof processorFuncCallback === "function") {
            processorFuncCallback(results);
          }

        }, errorDB);


      } else {

        Conference.websql.selectQuery(webSQLQuery, function(results) {

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
