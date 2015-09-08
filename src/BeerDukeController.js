(function () {
  'use strict';

  function BeerDukeControllerController($log, BeerDukeService, BeerDukeSettings) {
    var ctrl = this;

    ctrl.slots = {};

    BeerDukeService.callbacks.onConnect = function () {
      BeerDukeService.subscribe('/beer-duke/slot/#');
    };
    BeerDukeService.callbacks.onMessageArrived = function (m) {
      $log.info('m.payloadString =', m.payloadString);

      var slotNo = m.destinationName.match(/^\/beer-duke\/slot\/([0-9]+)$/);

      if (slotNo && slotNo.length == 2) {
        try {
          $log.info('slot', slotNo[1]);
          var slot = parseInt(slotNo[1]);
          var count = parseInt(m.payloadString);
          $log.info('slot ' + slot + ' = ' + count);
          ctrl.slots[slot] = count;
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
      var payload = {
        code: this.code,
        email: this.email
      };
      $log.info('payload', payload);

      BeerDukeService.submit('/beer-duke/give-beer', payload);
    };

    BeerDukeService.connect('controller');
  }

  function run(BeerDukeService) {
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
