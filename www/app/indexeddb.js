var Conference = Conference || {};

Conference.indexedDB = (function($) {

  var dbOpenRequest = null,
    db = null,
    dbName = '',
    dbVersion = -1;

  function init(dbName, dbVersion, dbSchema, successCallback, failureCallback) {

    if (!window.indexedDB) {
      alert("Your browser doesn't support a stable version of IndexedDB.");
      return false;
    }

    this.dbName = dbName;
    this.dbVersion = dbVersion;

    dbOpenRequest = window.indexedDB.open(dbName, dbVersion);

    dbOpenRequest.onupgradeneeded = function(e) {

      console.log("Creating/upgrading IndexedDB object store.");

      db = e.target.result;

      if (!db.objectStoreNames.contains("sessions")) {

        createDatabase(dbSchema);

      }

    }

    dbOpenRequest.onsuccess = function(evt) {

      db = evt.target.result;

      if (successCallback) {
        successCallback(db);
      }

    };

    dbOpenRequest.onerror = failureCallback;

  }

  function createDatabase(dbSchema) {

    for (currentObjectStoreName in dbSchema) {

      if (dbSchema.hasOwnProperty(currentObjectStoreName)) {

        var objectStore = null;
        var currentObjectStoreSettings = dbSchema[currentObjectStoreName];
        var currentObjectStoreIndexSettings = currentObjectStoreSettings['indexes'];

        if (currentObjectStoreSettings) {

          if (!currentObjectStoreSettings['key'] || currentObjectStoreSettings['key'].toLowerCase() === 'auto') {

            objectStore = db.createObjectStore(currentObjectStoreName, {
              autoIncrement: true
            });

          } else {

            objectStore = db.createObjectStore(currentObjectStoreName, {
              keyPath: currentObjectStoreSettings['key']
            });

          }

          if (currentObjectStoreIndexSettings) {

            for (currentIndexName in currentObjectStoreIndexSettings) {

              // CG - If we have a compund keypath (i.e. multiple properties) then split the keypath on the commas into an array and remove any trailing whitespace,
              // otherwise, just use the index name.
              var indexKeyPath = (currentIndexName.indexOf(",") > -1) ? currentIndexName.replace(/^\s+|\s+$/g, "").split(/\s*,\s*/) : currentIndexName;

              objectStore.createIndex(currentIndexName, indexKeyPath, {
                unique: currentObjectStoreIndexSettings[currentIndexName]
              });

            }

          }
        }
      }
    }
  }

  function insertInto(objectStoreName, data, successCallback, failureCallback) {

    var insertTransaction = db.transaction([objectStoreName], "readwrite");
    var objectStore = insertTransaction.objectStore(objectStoreName);
    var insertRequest = null;

    insertTransaction.onerror = failureCallback;

    if (!isArray(data)) {

      insertRequest = objectStore.add(data);
      insertRequest.onerror = failureCallback;
      insertRequest.onsuccess = successCallback;

    } else {

      for (var i = 0, len = data.length; i < len; i++) {
        insertRequest = objectStore.add(data[i]);
        insertRequest.onerror = failureCallback;
      }

    }

    // CG - When we are done adding all of the data, call the successCallback.
    successCallback();

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
