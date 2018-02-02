(function () {

    "use strict";
    var path_db = "db/index.php";

    var Einkaufsliste = angular.module( "Einkaufsliste", ['ngRoute', 'ngAnimate'] );
    

    Einkaufsliste
        .config( [
            '$routeProvider',
            function ( $routeProvider ) {

                $routeProvider
                    .when( '/', {
                        templateUrl: 'src/views/list.tpl.html'
                    } )
                    .when( '/new', {
                        templateUrl: 'src/views/new.tpl.html'
                    } )
                    .when( '/about', {
                        templateUrl: 'about.html',
                        controller: 'NavigationController',
                        controllerAs: 'nav'
                    } )
                    .otherwise( {redirectTo: '/'} );
            }
        ] )
        .controller( 'EinkaufslisteController', function () {

        } )
        .controller( 'ListController', function ( $http, $location ) {

            var list = this;
            this.newEntry = {};
            this.Entries = [];

            this.loadList = function () {
                $http.get( path_db + "/list" )
                    .success( function ( data ) {
                        list.isOffline = false;
                        list.Entries = data;
                        try {
                            window.localStorage.clear();
                            window.localStorage.setItem( 'items', JSON.stringify( data ) );
                        } catch ( e ) {
                            // nothing to do
                        }
                    } )
                    .error( function ( error ) {
                        list.isOffline = true;
                        try {
                            list.Entries = JSON.parse( window.localStorage.getItem( 'items' ) );
                        } catch ( e ) {
                            // nothing to do
                        }
                    } )
            };

            this.addListEntry = function () {

                if ( this.newEntry.name && this.newEntry.amount ) {

                    var newEntry = {
                        name: this.newEntry.name,
                        amount: this.newEntry.amount.toString(),
                        addAnother: this.newEntry.addAnother
                    };

                    if ( !newEntry.addAnother ) {

                        $location.path( '/' );
                    }
                    $http
                        .post( path_db + '/add', newEntry )
                        .success( function ( data ) {
                            list.isOffline = false;

                            if ( data.id ) {
                                list.Entries.push( data );
                                list.newEntry = {};
                                if ( newEntry.addAnother ) {
                                    list.newEntry.addAnother = newEntry.addAnother;
                                }
                            } else {
                                alert( 'Das hast Du schon auf der Liste!' );
                                $location.path( '/new' );
                            }
                        } )
                        .error( function () {
                            $location.path( '/new' );
                            list.isOffline = true;
                        } );
                }

            };

            this.deleteEntries = function () {

                var _delete = {'delete': []};

                for ( var idx in list.Entries ) {

                    var entry = list.Entries[idx];
                    if ( entry.delete ) {
                        _delete.delete.push( entry.id );
                    }
                }

                // only post if there are entries to delete
                if ( _delete.delete.length ) {
                    $http
                        .post( path_db + "/delete", _delete )
                        .success( function ( data ) {
                            list.isOffline = false;

                            if ( data.status === "ok" ) {
                                list.loadList();
                            }
                        } )
                        .error( function () {
                            list.isOffline = true;
                        } );
                }

            };
            /**
             *  Toggle checkbox from wrapping LI, too (usability)
             * @param _entry
             */
            this.toggleEntryDelete = function ( _entry ) {
                
                _entry.delete = _entry.delete ? false : true;
                _entry.check = _entry.check ? false : true;
                
                var _check = {'check': []};
                
                 _check.check.push( _entry.id );

                 $http
                        .post( path_db + "/check", _check )
                        .success( function ( data ) {
                            list.isOffline = false;

                            if ( data.status === "ok" ) 
                            {
                            }
                        } )
                        .error( function () {
                            list.isOffline = true;
                        } );

            };

            this.loadList();

        } )
        .controller( 'NavigationController', function ( $location ) {

            this.isActive = function ( viewLocation ) {
                return viewLocation === $location.path();
            };

        } )
        .controller('serverSideEvents', function ($scope,$http) {

                $scope.updating = false;

                if (typeof(EventSource) !== "undefined") 
                {
                    // Yes! Server-sent events support!
                    var source = new EventSource( path_db + '/stream');
                    

                    source.onmessage = function (event) 
                    {
                        var data = JSON.parse(event.data);
                        for (var i = 0, len = data.length; i < len; ++i) 
                        {
                            var student = data[i];
                            var myEl = angular.element( document.querySelector( '#einkaufsliste-item-'+student.id ) );
                            var myEl2 = angular.element( document.querySelector( '#einkaufsliste-item-name-'+student.id ) );
                            myEl.addClass('disabled');
                            myEl.addClass('strike');
                        }
                        console.log(data);
                    };
                }
                else 
                {
                    // Sorry! No server-sent events support..
                    alert('SSE not supported by browser.');
                }

            $scope.update = function () {
                $scope.updateTime = Date.now();
                $scope.updating = true;
            }

            $scope.reset = function () {
                $scope.updating = false;
            }
        })
})();