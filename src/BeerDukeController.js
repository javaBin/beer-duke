(function () {
  'use strict';

  function BeerDukeControllerController($log, BeerDukeService, BeerDukeSettings) {
    var ctrl = this;

    if (BeerDukeSettings.showSettings()) {
      ctrl.code = 123;
      ctrl.email = 'foo@example.org';
    }

    ctrl.requestBeer = function () {
      var payload = {
        code: this.code,
        email: this.email
      };
      $log.info('payload', payload);

      BeerDukeService.submit('/beer-duke', payload);
    };

    BeerDukeService.callbacks.onMessageArrived = function (m) {
      ctrl.lastCode = m.code;
    }
  }

  function run(BeerDukeService) {
    BeerDukeService.connect('controller');
  }

  function config($routeProvider) {
    $routeProvider
      .when('/', {
        controller: BeerDukeControllerController,
        controllerAs: 'ctrl',
        templateUrl: 'templates/controller.html'
      });
  }

  angular.module('BeerDukeController', ['ngRoute', 'BeerDuke'])
    .run(run)
    .config(config);
}());
