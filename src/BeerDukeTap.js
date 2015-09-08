(function () {
  'use strict';

  function BeerDukeTapController($log, $timeout, BeerDukeService) {
    var ctrl = this;

    rotateCode();
    self.count = 0;
    self.code = '';

    function rotateCode() {
      self.code = '' + self.count++;
      $timeout(function () {
        rotateCode();
      }, 1000);
    }

    BeerDukeService.callbacks.onConnect = function () {
      BeerDukeService.subscribe('/beer-duke');
    };
    BeerDukeService.callbacks.onMessageArrived = function (m) {
      $log.info('m.payloadString =', m.payloadString);
      var payload = angular.fromJson(m.payloadString);

      var code = payload.code;
      var email = payload.email;

      if (typeof code !== 'string' && typeof email !== 'string') {
        $log.warn('bad payload', payload.code);
        return;
      }

      ctrl.message = payload;
    };

    BeerDukeService.connect('tap');
  }

  function run(BeerDukeService) {
  }

  function config($routeProvider) {
    $routeProvider
      .when('/', {
        controller: BeerDukeTapController,
        controllerAs: 'ctrl',
        templateUrl: 'templates/tap.html'
      });
  }

  angular.module('BeerDukeTap', ['BeerDuke', 'ngRoute'])
    .run(run)
    .config(config);
}());
