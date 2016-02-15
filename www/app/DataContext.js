var Conference = Conference || {};

Conference.dataContext = (function ($) {

    "use strict";

    var useIndexedDB = false;
    var db = null;
    var processorFunc = null;
    
    var DATABASE_NAME = 'conference_db';

    // Use OLD_DATABASE_VERSION when upgrading databases. It indicates
    // the version we can upgrade from. Anything older and we tell the user
    // there's a problem
    var OLD_DATABASE_VERSION = "0";
    // The current database version supported by this script
    var DATABASE_VERSION = "1.0";

    // CG - These database versions have to be an integer.
    var INDEXED_DB_OLD_DATABASE_VERSION = 0;
    var INDEXED_DB_DATABASE_VERSION = 1;

    var errorDB = function (err) {
        console.log("Error processing SQL: " + err.code);
    }

    var init = function () {

        var test = {
          'sessions': {
            'key': '_id',
            'indexes': {
              'title': false,
              'type': false,
              'dayId': false
            }
          },
          'test_objstore': {
            'key': 'auto'
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
                'type': 'text',
                'autoIncrement': false
              },
              'startTime': 'text',
              'endTime': 'text',
              'type': 'text',
              'dayId': {
                'type': 'integer'
              },
            }
          }
        }

        if (useIndexedDB) {

          Conference.indexedDB.init("conference_db", 1, test, function(db) {

            $.getJSON( "data/data.json", function( data ) {

              Conference.indexedDB.insertInto('sessions', data, function() {

                console.log("DATA ADDED!");

              }, null);


            }).fail(function() {
              alert("Error: Unable to load session data from JSON source.");
            });

          }, null);

        } else {

          Conference.websql.init("conference_db", 0, 1, webSQLSchema, function(db) {

            $.getJSON( "data/data.json", function( data ) {

              Conference.websql.insertInto('sessions', data, function() {

                console.log("DATA ADDED!");

              }, null);


            }).fail(function() {
              alert("Error: Unable to load session data from JSON source.");
            });

          }, function(queryTransaction, transactionError) {

            alert("Error occured whilst creating WebSQL database: " + transactionError.message);

          });

        }

    };

    var getSessions = function(processorFuncCallback) {

      var indexedDBQuery = {

        'sessions': {
          'index': 'dayId',
          'equals': 1
        }

      }

      var webSQLQuery = {

        // 'sessions': {
        //   'index': 'dayId',
        //   'equals': 1
        // }
        //
        // 'sessions': {
        //   '$and': {
        //     'dayId': 1,
        //     'title': 'hello'
        //   }
        // }
        // 'sessions': {
        //   'index': 'title, name',
        //   'equals': 'test title, connor',
        //   'lowerBound': 'lower',
        //   'upperBound': 'upper'
        // }

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

        }, function(evt, error) {

          alert('Query error whilst parsing WebSQL DB: ' + error.message);

        });


      } else {

        Conference.websql.selectQuery(webSQLQuery, function(results) {

          if (typeof processorFuncCallback === "function") {
            processorFuncCallback(results);
          }

        }, function(evt, error) {

          alert('Query error whilst parsing WebSQL DB: ' + error.message);

        });

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
        processSessionsList:processSessionsList  // Called by Controller.js
    };

    return pub;
}(jQuery));
