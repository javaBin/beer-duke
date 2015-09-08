(function () {
  'use strict';

  function BeerDukeTapController($log, $timeout, BeerDukeService, BeerDukeSettings, TsService) {
    var ctrl = this;

    if(!BeerDukeSettings.values.clientId) {
      BeerDukeSettings.setRandomClientId();
    }

    var messages = ctrl.messages = [];
    ctrl.count = 0;
    ctrl.code = '';
    rotateCode();

    function rotateCode() {
      ctrl.code = '' + ctrl.count++;
      $timeout(function () {
        rotateCode();
      }, 1000);
    }

    BeerDukeService.callbacks.onConnect = function () {
      BeerDukeService.subscribe(BeerDukeSettings.values.tap + '/give-beer');
    };
    BeerDukeService.callbacks.onMessageArrived = function (m) {
      $log.info('m.payloadString =', m.payloadString);

      var payload;
      try {
        payload = angular.fromJson(m.payloadString);
        messages.unshift(payload);
      } catch (e) {
        $log.warn('could not parse json payload', e);
        $log.warn('JSON:', payloadString);
        return;
      }

      if (m.destinationName == BeerDukeSettings.values.tap + '/give-beer') {
        var code = payload.code;
        var email = payload.email;

        if (typeof code !== 'string' && typeof email !== 'string') {
          $log.warn('bad payload', payload.code);
          return;
        }

        onGiveBeerRequest(email, code);
      }
    };

    function onGiveBeerRequest(email, code) {
      TsService.giveBeer().then(function(counts) {
        BeerDukeService.updateSlots(counts);
      });

      //ctrl.message = code;
    }

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
