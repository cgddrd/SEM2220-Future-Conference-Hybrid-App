var Conference = Conference || {};

Conference.websql = (function($) {

  var db = null,
    dbName = '',
    dbOldVersion = '0',
    dbVersion = -1,
    createSQLTemplate = "CREATE TABLE %table% (%columns%)";

  function performQuery(query, successCallback, failureCallback) {

    if (!db) {
      failureCallback(null, new Error("Unable to perform SQL query: no connection to database."));
    }

    db.transaction(function(queryTransaction) {

      queryTransaction.executeSql(query, [], successCallback, failureCallback);

    });

  }

  function performParameterisedQuery(query, values, successCallback, failureCallback) {

    if (!db) {
      failureCallback(null, new Error("Unable to perform SQL query: no connection to database."));
    }

    db.transaction(function(queryTransaction) {

      queryTransaction.executeSql(query, values, successCallback, failureCallback);

    });

  }

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
      createDatabase(dbSchema, successCallback, failureCallback);
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

  function prepareCreateStatement(dbSchema) {

    for (currentObjectStoreName in dbSchema) {

      if (dbSchema.hasOwnProperty(currentObjectStoreName)) {

        var currentObjectStoreSettings = dbSchema[currentObjectStoreName];
        var currentObjectStoreColumnSettings = currentObjectStoreSettings['columns'];
        var columns = [];
        var createString = "";

        if (currentObjectStoreSettings && currentObjectStoreColumnSettings) {

          for (currentColumnName in currentObjectStoreColumnSettings) {

            var columnCreateString = currentColumnName;

            if (isString(currentObjectStoreColumnSettings[currentColumnName])) {

              columnCreateString = columnCreateString.concat(" " + currentObjectStoreColumnSettings[currentColumnName].toUpperCase());

            } else {

              var currentIndividualColumnSettings = currentObjectStoreColumnSettings[currentColumnName];

              if (currentIndividualColumnSettings['type']) {

                columnCreateString = columnCreateString.concat(" " + currentIndividualColumnSettings['type'].toUpperCase());

              }

              if (currentIndividualColumnSettings['primaryKey']) {

                columnCreateString = columnCreateString.concat(" PRIMARY KEY");

              }

              if (currentIndividualColumnSettings['autoIncrement']) {

                columnCreateString = columnCreateString.concat(" AUTOINCREMENT");

              }

              if (!currentIndividualColumnSettings['allowNulls']) {

                columnCreateString = columnCreateString.concat(" NOT NULL");

              }

            }

            columns.push(columnCreateString);

          }
        }
      }
    }

    return createSQLTemplate.replace('%table%', currentObjectStoreName)
      .replace('%columns%', columns.join(', '));


  }

  function createDatabase(dbSchema, successCallback, failureCallback) {

    var createQueryString = prepareCreateStatement(dbSchema);

    performQuery(createQueryString, successCallback, failureCallback);

  }


  function insertInto(objectStoreName, data, successCallback, failureCallback) {

    var insertTemplate = "INSERT INTO %table% (%columns%) VALUES (%sqlParams%);";

    for (var i = 0, len = data.length; i < len; i++) {

      var currentObject = data[i];

      var columns = [],
        values = [],
        sqlParams = [];

      for (property in currentObject) {

        if (currentObject.hasOwnProperty(property)) {

          columns.push(property);
          values.push(currentObject[property]);

          // CG - Could use string concatenation here, but then we have to remove the last question mark.
          sqlParams.push('?');

        }

      }

      var queryString = insertTemplate.replace('%table%', objectStoreName)
                                      .replace('%columns%', columns.join(','))
                                      .replace('%sqlParams%', sqlParams.join(','));

      console.log(queryString);

      performParameterisedQuery(queryString, values, successCallback, failureCallback);

    }

  }

  function selectQuery(query, successCallback, failureCallback) {

    for (targetObjectStoreName in query) {

      if (query.hasOwnProperty(targetObjectStoreName)) {

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
