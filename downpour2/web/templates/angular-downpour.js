/*
 * Core app module
 */
var downpour = angular.module('downpour', ['ngRoute', 'dpServices', 'dpDirectives', 'dpControllers',
    'account', 'transfers', 'library'
    //{% if modules|count %}, '{{ modules|join('\', \'', attribute='namespace') }}'{% endif %}
]);

/*
 * Setup core routing rules
 */
downpour.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {

        $locationProvider.html5Mode(true);

        // Configure core routes
        $routeProvider.when('/transfers', {
            templateUrl: '/resources/templates/transfers/index.html',
            controller: 'TransferList'
        }).when('/transfers/:id', {
            templateUrl: '/resources/templates/transfers/detail.html',
            controller: 'TransferDetail'
        }).when('/account/login', {
            templateUrl: '/resources/templates/account/login.html',
            controller: 'AccountLogin'
        }).when('/', {
            templateUrl: '/resources/templates/index.html',
            controller: 'dpOverview'
        }).otherwise({
            redirectTo: '/'
        });

    }
]);

/*
 * Core service providers.
 */
var dpServices = angular.module('dpServices', []);

/*
 * Content injector service provider which allows modules to add hooks
 * into shared UI sections during config()
 */
dpServices.provider('contentInjector',
    function() {

        this.DEFAULT = {};
        this.SETTINGS = {};
        this.ADMIN = {};

        var navLinks = [];
        var settingLinks = [];
        var adminLinks = [];
        var navGroups = [];
        var blocks = {};

        var navLink = function(name, url, section) {
            return { 'name': name, 'url': url, 'section': section };
        };

        var addNavLink = function(group, name, url, section) {
            if (group === this.DEFAULT)
                navLinks.push(navLink(name, url, section));
            else if (group === this.SETTINGS)
                settingLinks.push(navLink(name, url, section));
            else if (group === this.ADMIN)
                adminLinks.push(navLink(name, url, section));
        };

        var navGroup = function(name, links, url) {
            return { 'name': name, 'url': url, 'links': links };
        };

        var addBlock = function(name, template, controller) {
            if (!(name in blocks))
                blocks[name] = [];
            blocks[name].push({'template': template, 'controller': controller });
        }

        var addNavGroup = function(name, links, url) {
            navGroups.push(navGroup(name, links, url));
        };

        this.navLink = navLink;
        this.addNavLink = addNavLink;
        this.navGroup = navGroup;
        this.addNavGroup = addNavGroup;
        this.addBlock = addBlock;

        this.$get = ['$rootScope', function($rootScope) {

            return {
                'navLink': navLink,
                'addNavLink': addNavLink,
                'navGroup': navGroup,
                'addNavGroup': addNavGroup,
                'menu': {
                    'navLinks': navLinks,
                    'settingLinks': settingLinks,
                    'adminLinks': adminLinks,
                    'navGroups': navGroups,
                    'open': false, // State for mobile slide out menu
                    'toggling': false // State for mobile slide out menu
                },
                'addBlock': addBlock,
                'block': function(name) {
                    if (name in blocks)
                        return blocks[name];
                    return [];
                }
            };

        }];

    }
);

dpServices.service('state', ['$rootScope', '$http', '$q',
    function($rootScope, $http, $q) {

        var update = function() {
            return $http.get('/app/state').success(function(data) {
                angular.extend($rootScope.state, data);
            }).then(
                function(response) {
                    return response.data;
                },
                function(response) {
                    return $q.reject("Could not refresh state");
                }
            );
        };

        $rootScope.state = {
            'update': update
        };

        update();

        return {
            'update': update,
            'state': $rootScope.state
        };

    }
]);

dpServices.service('authenticator', ['$rootScope', '$http', '$location', '$q',
    function($rootScope, $http, $location, $q) {

        var set = function(user) {
            $rootScope.user = user;
            $rootScope.$broadcast('$userChanged', user);
            return user;
        }

        /*
         * Login as the specified user.
         */
        var login = function(username, password) {

            return $http({
                method: 'POST',
                url: '/account/login',
                data: $.param({
                    'username': username,
                    'password': password
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(
                function(response) {
                    return set(response.data);
                },
                function(response) {
                    set(null);
                    return $q.reject("Login failed");
                }
            );

        };

        /*
         * Log the current user out.
         */
        var logout = function() {
            set(null);
        };

        /*
         * Check if the user is authenticated.
         */
        var authenticated = function() {

            if ('user' in $rootScope) {
                if (!!$rootScope.user)
                    return $q.when($rootScope.user);
                else {
                    $location.path("/account/login");
                    return $q.reject("Not authenticated");
                }
            } else {
                return $http.get('/account/detail').then(
                    function(response) {
                        return set(response.data);
                    },
                    function(response) {
                        set(null);
                        return $q.reject("Not authenticated")
                    }
                );
            }

        };

        /*
         * Require that the user be logged in, or redirect to login page.
         */
        var require = function() {

            return authenticated().then(
                function(user) {
                    return user;
                },
                function(error) {
                    $location.path("/account/login");
                    return $q.reject(error);
                }
            );

        };

        return {
            'login': login,
            'logout': logout,
            'authenticated': authenticated,
            'require': require
        };

    }
]);

/*
 * Core directives.
 */
var dpDirectives = angular.module('dpDirectives', ['ngTouch']);

dpDirectives.directive('drawerSlide', ['$swipe',
    function($swipe) {

        var link = function(scope, element, attrs) {

            var drawer = $(attrs['drawerSlide']);

            // Update nav height on scroll
            var topOffset = drawer.position().top;
            drawer.height($(window).height() - topOffset);

            drawer.niceScroll({ hidecursordelay: 100 });
            $(window).on('scroll', function(e) {
                drawer.height($(window).height() - topOffset);
                drawer.getNiceScroll().resize();
            });

            drawer.on('selectstart', function(e) {
                return false;
            });

            $swipe.bind(element, {
                'start': function(point) {
                    console.log('start');
                },
                'move': function(point) {
                    console.log(point);
                },
                'end': function(point) {
                    console.log('end');
                },
                'cancel': function() {
                    console.log('cancel');
                }
            })

        };

        return {
            'link': link
        };

    }
]);


/*
 * Core controllers.
 */
var dpControllers = angular.module('dpControllers', []);

/*
 * Main controller for header/footer/menu.
 */
dpControllers.controller('dpPage', ['$scope', '$routeParams', '$http', '$rootScope', '$interval',
    'state', 'contentInjector',
    function($scope, $routeParams, $http, $rootScope, $interval, state, contentInjector) {

        // Menu / etc
        $scope.title = 'Downpour';
        $scope.menu = contentInjector.menu;
        $rootScope.section = 'overview';
        $rootScope.setSection = function(s) {
            $rootScope.section = s;
        }

        // Host/bandwidth status
        var update = function() {
            $http.get('/app/host').success(function(data) {
                angular.extend($scope.host, data);
            });
        };

        $scope.host = {
            'update': update
        };

        update();

        $scope.interval = $interval(update, 5000)

        $scope.$on('$destroy', function() {
            $interval.cancel($scope.interval);
        })

    }
]);

dpControllers.controller('dpOverview', ['$scope', '$http', 'authenticator',
    function($scope, $http, authenticator) {

        authenticator.require().then(
            function(user) {
                // Setup page here
            }
        )

    }
])

