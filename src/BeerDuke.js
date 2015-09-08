(function () {
  'use strict';

  function SettingsController($log, $location, BeerDukeSettings) {
    var ctrl = this;

    ctrl.settings = BeerDukeSettings.values;

    ctrl.save = function () {
      BeerDukeSettings.save();
      $location.path('/')
    }
  }

  function BeerDukeSettings() {

    var keys = [
      'clientId',
      'showSettings',
      'tsUrl'
    ];

    var values = {};

    function save() {
      _.forEach(keys, function (key) {
        store('key', values[key]);
      });
    }

    function store() {
      window.localStorage['beer-duke'] = angular.toJson(values);
    }

    function load() {
      values = angular.fromJson(window.localStorage['beer-duke'] || '{}');
    }

    function setRandomClientId() {
      values.clientId = values.clientId || 'beer-duke-' + Math.round(Math.random() * 100000);
      save();
    }

    load();
    values.showSettings = values.showSettings || false;
    values.tap = values.tap || '/beer-duke';
    save();

    return {
      setRandomClientId: setRandomClientId,
      keys: keys,
      values: values,
      load: load,
      save: save
    }
  }

  function BeerDukeService($log, $timeout, $rootScope, BeerDukeSettings) {
    var self = this;
    var connected_ = false;
    var messages = [];
    var callbacks = {};
    var problems = {};

    function connect(type) {
      var clientId = BeerDukeSettings.values.clientId + "-" + type;
      var client = new Paho.MQTT.Client("wss://trygvis.io:9001/", clientId);
      client.onConnectionLost = function () {
        console.log('onConnectionLost =', arguments);
        problems.wat = 'hei';
        var args = arguments;
        $timeout(function () {
          $rootScope.$apply(function () {
            onConnectionLost.apply(self, args);
          })
        });
      };
      client.onMessageArrived = function () {
        var args = arguments;
        $timeout(function () {
          $rootScope.$apply(function () {
            onMessageArrived.apply(self, args);
          })
        });
      };

      self.client = client;

      self.client.connect({
        cleanSession: true,
        onSuccess: function () {
          problems.connect_response = arguments;
          var args = arguments;
          $timeout(function () {
            $rootScope.$apply(function () {
              onConnect.apply(self, args);
            })
          });
        }
      });
    }

    function subscribe(name) {
      $log.info('subscribing to ' + name);
      return self.client.subscribe(name);
    }

    function connected() {
      return connected_;
    }

    function onConnect() {
      $log.info('Connected', arguments);

      connected_ = true;

      invoke('onConnect', arguments);
    }

    function invoke(name, args) {
      var fn = callbacks[name];

      if (typeof fn === 'function') {
        try {
          return fn.apply(undefined, args);
        } catch (e) {
          $log.warn('exception calling ' + name, e);
        }
      }
    }

    function onConnectionLost(responseObject) {
      connected_ = false;

      problems.connectionLost = responseObject;
    }

    function onMessageArrived(message) {
      messages.push(message);
      try {
        var m = angular.fromJson(message);
        invoke('onMessageArrived', [m]);
      } catch (e) {
        $log.warn('could not parse json', e);
      }
    }

    function requestBeer(code) {
      var payload = {code: code, email: BeerDukeSettings.values.clientId};
      console.log('payload =', payload);
      var message = new Paho.MQTT.Message(angular.toJson(payload));
      message.destinationName = BeerDukeSettings.values.tap + '/give-beer';
      message.qos = 1;
      message.retained = false;
      self.client.send(message);
    }

    function updateSlots(counts) {
      var message = new Paho.MQTT.Message(angular.toJson(counts));
      message.destinationName = BeerDukeSettings.values.tap + '/slots';
      message.qos = 0;
      message.retained = true;
      self.client.send(message);
    }

    return {
      messages: messages,
      connect: connect,
      subscribe: subscribe,
      connected: connected,
      callbacks: callbacks,
      updateSlots: updateSlots,
      requestBeer: requestBeer,
      problems: problems
    }
  }

  function TsService($q, $log, $http, BeerDukeSettings) {
    var url = BeerDukeSettings.values.tsUrl;

    function giveBeer() {
      if (!url) {
        return $q.resolve([
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100),
          Math.round(Math.random() * 100)
        ]);
      }
      return $http.get(url + '/GiveBeer').then(function (res) {
        $log.info('beer dispensed!', res);
        return res.data;
      });
    }

    return {
      giveBeer: giveBeer
    }
  }

  function config($routeProvider) {
    $routeProvider
      .when('/settings', {
        controller: SettingsController,
        controllerAs: 'ctrl',
        templateUrl: 'templates/settings.html'
      })
      .otherwise({
        redirectTo: '/'
      })
  }

  function run($rootScope, BeerDukeSettings, BeerDukeService) {
    $rootScope.settings = BeerDukeSettings.values;
    $rootScope.mqtt = {
      connected: BeerDukeService.connected,
      problems: BeerDukeService.problems
    }
  }

  angular.module('BeerDuke', ['ngRoute'])
    .factory('BeerDukeService', BeerDukeService)
    .factory('TsService', TsService)
    .factory('BeerDukeSettings', BeerDukeSettings)
    .config(config)
    .run(run);
}());
