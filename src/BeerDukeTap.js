(function () {
  'use strict';

  function BeerDukeTapController($log, $timeout, $http, BeerDukeService, BeerDukeSettings, TsService) {
    var ctrl = this;

    var heros = [];

    if (!BeerDukeSettings.values.clientId) {
      BeerDukeSettings.setRandomClientId();
    }

    var messages = ctrl.messages = [];
    ctrl.count = 0;
    ctrl.code = '';
    ctrl.codes = [];

    function randomDigit() {
      return '' + (Math.round(Math.random() * 9) + 1);
    }

    function rotateCode() {
      var c = randomDigit() + randomDigit() + randomDigit() + randomDigit() + randomDigit();
      ctrl.code = c;
      ctrl.codes.push(c);
      ctrl.codes = ctrl.codes.slice(1);
      $timeout(function () {
        rotateCode();
      }, 60 * 1000);
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
      TsService.giveBeer().then(function (counts) {
        BeerDukeService.updateSlots(counts);
      });

      var hero = _.find(heros, {email: email});

      if (hero) {
        ctrl.hero = hero;
      } else {
        ctrl.zero = email;
      }

      rotateCode();
    }

    BeerDukeService.connect('tap');
    rotateCode();
    $http.get('sdkfjsdkljlsdkjg.json').then(function (res) {
      heros = res.data;
    })
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
