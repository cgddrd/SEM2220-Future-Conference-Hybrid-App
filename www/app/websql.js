var Conference = Conference || {};

Conference.websql = (function ($) {

        var db = null,
            dbName = '',
            dbOldVersion = '0',
            dbVersion = -1;

        // CG - TODO: NEED TO CHANGE THIS TO BE AN OBJECT! (E.G. TO PASS IN SIZE, OLD AND NEW VERSION NUMBERS ETC..)
        function init(dbName, dbOldVersion, dbVersion, dbSchema, successCallback, failureCallback) {

          if (typeof window.openDatabase === "undefined") {
              alert("Your browser doesn't support a stable version of WebSQL.");
              return false;
          }

          this.dbName = dbName;
          this.dbVersion = dbVersion;

          // CG - We deliberatly set an empty value for the version so that it defaults to 0, and therefore we know to populate it on creation.
          db = window.openDatabase(dbName, "", "", 200000);

          // If the version is empty then we know it's the first create so set the version
          // // and populate
          if (db.version.length == 0) {
              db.changeVersion("", dbVersion);
              createDatabase(dbSchema);
          } else if (db.version == dbOldVersion) {
              // We can upgrade but in this example we don't!
              alert("upgrading database");
          } else if (db.version != dbVersion) {
              // Trouble. They have a version of the database we
              // cannot upgrade from
              alert("incompatible database version");
              return false;
          }

        }

        function createDatabase(dbSchema) {

          var createTemplate = "CREATE TABLE %table% (%columns%);";

          console.log(dbSchema);

          for (currentObjectStoreName in dbSchema) {

            if(dbSchema.hasOwnProperty(currentObjectStoreName)) {

                var currentObjectStoreSettings = dbSchema[currentObjectStoreName];
                var currentObjectStoreColumnSettings = currentObjectStoreSettings['columns'];
                var columns = [];
                var createString = "";

                if (currentObjectStoreSettings && currentObjectStoreColumnSettings) {

                  for (currentColumnName in currentObjectStoreColumnSettings) {

                    var columnString = currentColumnName;

                    if (isString(currentObjectStoreSettings[currentColumnName])) {

                      columnString.concat(currentObjectStoreSettings[currentColumnName]);

                    } else {

                      var currentIndividualColumnSettings = currentObjectStoreColumnSettings[currentColumnName];

                      console.log(currentIndividualColumnSettings);

                      if (currentIndividualColumnSettings['type']) {

                        columnString = columnString.concat(" " + currentIndividualColumnSettings['type'].toUpperCase());

                      }

                      if (currentIndividualColumnSettings['primaryKey']) {

                        //console.log("primary key");

                        columnString = columnString.concat(" PRIMARY KEY");

                      }

                      if (currentIndividualColumnSettings['autoIncrement']) {

                        columnString = columnString.concat(" AUTOINCREMENT");

                      }

                      if (!currentIndividualColumnSettings['allowNulls']) {

                        columnString = columnString.concat(" NOT NULL");

                      }

                    }

                    columns.push(columnString);

                  }

                  createString = createTemplate.replace('%table%', currentObjectStoreName).replace('%columns%', columns.join(','));

                  console.log(createString);
                }

            }

          }

        }

        function insertInto(objectStoreName, data, successCallback, failureCallback) {

            db.transaction(function(insertTransaction) {

              var insertTemplate = "INSERT INTO %table% (%columns%);";

              for (var i = 0, len = data.length; i < len; i++) {

                var currentObject = data[i];

                var columns = [], values = [];

                for (property in currentObject) {

                  if(query.hasOwnProperty(property)) {

                    columns.push(property);
                    values.push(currentObject[property]);

                  }

                }

                var res = insertTemplate.replace('%columns%', columns.join(',').replace('%values%', values.join(',')));

                console.log(res);

              }

            }, failureCallback, successCallback);

        }

        function selectQuery(query, successCallback, failureCallback) {

            for (targetObjectStoreName in query) {

              if(query.hasOwnProperty(targetObjectStoreName)) {

                var querySettings = query[targetObjectStoreName];

                var queryTransaction = db.transaction([targetObjectStoreName], "readonly");
                var objectStore = queryTransaction.objectStore(targetObjectStoreName);

                queryTransaction.onerror = failureCallback;

                var index = objectStore.index(querySettings['index']);

                var cursorRequest = null;
                var boundKeyRange = null;
                var sortDirection = "next";
                var queryResults = [];

                if (querySettings['equals']) {

                  console.log(querySettings['equals']);

                  boundKeyRange = IDBKeyRange.only(querySettings['equals']);

                } else if (querySettings['lowerBound'] && querySettings['upperBound']) {

                  boundKeyRange = IDBKeyRange.bound(querySettings['lowerBound'], querySettings['upperBound']);

                } else if (querySettings['lowerBound']) {

                  boundKeyRange = IDBKeyRange.lowerBound(querySettings['lowerBound']);

                } else if (querySettings['upperBound']) {

                  boundKeyRange = IDBKeyRange.upperBound(querySettings['upperBound']);

                }

                if (querySettings['sort'] && (querySettings['sort'].toLowerCase() === 'desc' || querySettings['sort'].toLowerCase() === 'prev')) {

                  sortDirection = 'prev';

                }

                cursorRequest = index.openCursor(boundKeyRange, sortDirection)

                cursorRequest.onsuccess = function(event) {

                  var cursor = event.target.result;

                  if (cursor) {

                    // cursor.key is a name, like "Bill", and cursor.value is the whole object.
                    queryResults.push(cursor.value);
                    cursor.continue();

                  } else {

                    successCallback(queryResults);

                  }

                };

                cursorRequest.onerror = failureCallback;

              }

              // CG - SANITY CHECK: We can only query one object store per call, therefore we ignore any other queries apart from whatever the first one is (no guarantee of order).
              break;

            }

        }

        function isString(checkStr) {

          return checkStr instanceof String || typeof checkStr === "string";

        }

        // CG - Modified from original source: http://www.shamasis.net/2011/08/infinite-ways-to-detect-array-in-javascript/
        function isArray(checkObj) {

          return Object.prototype.toString.call(checkObj) === "[object Array]";

        }

        return {
            init: init,
            insertInto: insertInto,
            selectQuery: selectQuery
        };

    })(jQuery);
