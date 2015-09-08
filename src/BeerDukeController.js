(function () {
  'use strict';

  function BeerDukeControllerController($log, $location, BeerDukeService, BeerDukeSettings) {
    var ctrl = this;

    console.log('ctrl: BeerDukeSettings.values.clientId =', BeerDukeSettings.values.clientId);
    if(!BeerDukeSettings.values.clientId) {
      $location.path('/login');
    }

    ctrl.slots = {};

    BeerDukeService.callbacks.onConnect = function () {
      BeerDukeService.subscribe(BeerDukeSettings.values.tap + '/slots');
    };
    BeerDukeService.callbacks.onMessageArrived = function (m) {
      $log.info('m.payloadString =', m.payloadString);

      if (m.destinationName == BeerDukeSettings.values.tap + '/slots') {
        try {
          var slotCounts = angular.fromJson(m.payloadString);
          if(_.isArray(slotCounts)) {
            _.forEach(ctrl.slots, function(key) {
              delete ctrl.slots[key];
            });
            _.forEach(slotCounts, function(count, index) {
              ctrl.slots[index] = count;
            });
          }
        } catch (e) {
          $log.warn(e);
        }
      }
    };

    if (BeerDukeSettings.values.showSettings) {
      ctrl.code = 123;
      ctrl.email = 'foo@example.org';
    }

    ctrl.requestBeer = function () {
      var code = this.code;
      $log.info('requesting beer, code=' + code);
      BeerDukeService.requestBeer(code);
    };

    ctrl.logOut = function () {
      console.log('BeerDukeSettings.values.clientId =', BeerDukeSettings.values.clientId);
      delete BeerDukeSettings.values.clientId;
      BeerDukeSettings.save();
      console.log('BeerDukeSettings.values.clientId =', BeerDukeSettings.values.clientId);
      $location.path('/login').replace();
    };

    BeerDukeService.connect('controller');
  }

  function LoginController($location, BeerDukeSettings) {
    var ctrl = this;

    ctrl.logIn = function () {
      BeerDukeSettings.values.clientId = ctrl.email;
      BeerDukeSettings.save();
      $location.path('/');
    }
  }

  function run(BeerDukeService) {
  }

  function config($routeProvider) {
    $routeProvider
      .when('/', {
        controller: BeerDukeControllerController,
        controllerAs: 'ctrl',
        templateUrl: 'templates/controller.html'
      })
      .when('/login', {
        controller: LoginController,
        controllerAs: 'ctrl',
        templateUrl: 'templates/login.html'
      });
  }

  angular.module('BeerDukeController', ['ngRoute', 'BeerDuke'])
    .run(run)
    .config(config);
}());
