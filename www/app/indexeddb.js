var Conference = Conference || {};

Conference.indexedDB = (function ($) {

        var dbOpenRequest = null,
            db = null,
            dbName = '',
            dbVersion = -1;

        function init(dbName, dbVersion, dbSchema, successCallback, failureCallback) {

          console.log("connor init");

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
          //  successCallback(db);

          };

          dbOpenRequest.onerror = failureCallback;

        }

        function createDatabase(dbSchema) {

          console.log(dbSchema);

          for (currentObjectStoreName in dbSchema) {

            if(dbSchema.hasOwnProperty(currentObjectStoreName)) {

                var objectStore = null;
                var currentObjectStoreSettings = dbSchema[currentObjectStoreName];
                var currentObjectStoreIndexSettings = currentObjectStoreSettings['indexes'];

                if (currentObjectStoreSettings) {

                  if (!currentObjectStoreSettings['key'] || currentObjectStoreSettings['key'].toLowerCase() === 'auto') {

                    objectStore = db.createObjectStore(currentObjectStoreName, { autoIncrement: true });

                  } else {

                    objectStore = db.createObjectStore(currentObjectStoreName, { keyPath: currentObjectStoreSettings['key'] });

                  }

                  if (currentObjectStoreIndexSettings) {

                    for (currentIndexName in currentObjectStoreIndexSettings) {

                      objectStore.createIndex(currentIndexName, currentIndexName, { unique: currentObjectStoreIndexSettings[currentIndexName] });

                    }

                  }


                }




            }

          }




        //  createCallback(db, objectStore);

          // // CG - Setup the indexes for the 'sessions' object store.
          // objectStore.createIndex("title", "title", { unique: false });
          // objectStore.createIndex("type", "type", { unique: false });
          // objectStore.createIndex("dayId", "dayId", { unique: false });
          //
          // // Use transaction oncomplete to make sure the objectStore creation is
          // // finished before adding data into it.
          // objectStore.transaction.oncomplete = function(event) {
          //
          //   $.getJSON( "data/data.json", function( data ) {
          //
          //     // Store values in the newly created objectStore.
          //     var sessionObjectStore = db.transaction("sessions", "readwrite").objectStore("sessions");
          //
          //     for (var i = 0; i < data.length; i++) {
          //         sessionObjectStore.add(data[i]);
          //     }
          //
          //   }).fail(function() {
          //       alert("Error: Unable to load session data from JSON source.");
          //   });
          //
          // };

        }

        // Reveal public pointers to
        // private functions and properties

        return {
            init: init
        };

    })(jQuery);
