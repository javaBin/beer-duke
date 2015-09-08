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
    var codes = [];
    var timerHandle;

    function rotateCode(clearCodes) {
      if (clearCodes) {
        codes = [];
      }
      var c = Math.round(Math.random() * 89999 + 10000);
      ctrl.code = c;
      codes.push(c);
      if (codes.length > 2) {
        codes = codes.slice(1);
      }
      if (timerHandle) {
        $timeout.cancel(timerHandle);
      }
      timerHandle = $timeout(function () {
        rotateCode(false);
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
      var hero = _.find(heros, {email: email});

      var validCode = _.indexOf(codes, code) >= 0;

      ctrl.zero = undefined;
      ctrl.hero = undefined;
      ctrl.badCode = undefined;

      if (hero && validCode) {
        ctrl.hero = hero;
        TsService.giveBeer().then(function (counts) {
          BeerDukeService.updateSlots(counts);
          BeerDukeService.updateLastBeer({hero});
        });
      } else if (hero && !validCode) {
        ctrl.hero = hero;
        ctrl.badCode = true;
        BeerDukeService.updateLastBeer({hero, badCode: true});
      } else {
        ctrl.zero = email;
        BeerDukeService.updateLastBeer({zero: email});
      }

      rotateCode(true);
    }

    BeerDukeService.connect('tap');
    rotateCode(false);
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
