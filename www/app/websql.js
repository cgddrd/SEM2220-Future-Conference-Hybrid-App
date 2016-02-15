var Conference = Conference || {};

Conference.websql = (function($) {

  var db = null,
    dbName = '',
    dbOldVersion = '0',
    dbVersion = -1,
    createSQLTemplate = "CREATE TABLE %table% (%columns%)";

  function performQuery(query, successCallback, failureCallback) {

    performParameterisedQuery(query, [], successCallback, failureCallback);

  }

  function performParameterisedQuery(query, values, successCallback, failureCallback) {

    if (!db) {
      failureCallback(null, new Error("Unable to perform SQL query: no connection to database."));
    }

    db.transaction(function(queryTransaction) {

      queryTransaction.executeSql(query, values, successCallback, failureCallback);

    }, successCallback, failureCallback);

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
    // We also by default set the database size to be the maximum value without requiring additional user permission (5 MB)
    db = window.openDatabase(dbName, "", "", 5 * 1024 * 1024);

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

      performParameterisedQuery(queryString, values, successCallback, failureCallback);

    }

  }

  function selectQuery(query, successCallback, failureCallback) {

    var selectSQLTemplate = "SELECT %selectColumns% FROM %table% %criteriaQuery%;";
    var criteriaQuerySQLTemplate = "WHERE %criteria%"

    for (targetObjectStoreName in query) {

      if (query.hasOwnProperty(targetObjectStoreName)) {

        var tableName = targetObjectStoreName;
        var querySettings = query[targetObjectStoreName];

        // CG - Set the default to return all columns from a table for the given query.
        var selectColumns = "*";
        var criteriaQuery  = "";

        if (querySettings['columns']) {
          selectColumns = querySettings['columns'];
        }

        if (querySettings['criteria']) {

          criteriaQuery = criteriaQuerySQLTemplate.replace('%criteria%',
                                                          sanitiseSQLQueryInput(querySettings['criteria']));

        }


        var selectSQLQuery = selectSQLTemplate.replace('%selectColumns%', selectColumns)
                                              .replace('%table%', tableName)
                                              .replace('%criteriaQuery%', criteriaQuery);

        // CG - TODO: Really we want to be using a parameterised SQL query. Need to figure this out.
        // Although, it's worth pointing out that we shouldn't be storing any sensitive information on the client machine anyway?
        performQuery(selectSQLQuery, function(tx, result) {

          successCallback(result.rows);

        }, failureCallback);

      }

      // CG - SANITY CHECK: We can only query one object store per call.
      // Therefore we ignore any other queries apart from whatever the first one is (no guarantee of order).
      break;

    }

  }

  function sanitiseSQLQueryInput(originalInput) {
    return originalInput.replace(/([^a-z0-9*=<>()\s]+)/gi, '');
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
