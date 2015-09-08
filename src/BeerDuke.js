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

    load();
    values.clientId = values.clientId || 'beer-duke-' + Math.round(Math.random() * 100000);
    values.showSettings = values.showSettings || false;
    save();

    return {
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

    function connect(type) {
      var clientId = BeerDukeSettings.values.clientId + "-" + type;
      var client = new Paho.MQTT.Client("wss://trygvis.io:9001/", clientId);
      client.onConnectionLost = function (a) {
        $timeout(function () {
          $rootScope.$apply(function () {
            onConnectionLost(a);
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
        onSuccess: function () {
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
      return self.client.subscribe(name);
    }

    function connected() {
      return self.connected_;
    }

    function onConnect() {
      $log.info('Connected');

      self.connected_ = true;

      invoke('onConnect');
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
      self.connected_ = false;

      //if (responseObject.errorCode !== 0)
      $log.warn("onConnectionLost:", responseObject);
      $log.warn("onConnectionLost:", responseObject.errorMessage);
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

    function submit(destination, payload) {
      var message = new Paho.MQTT.Message(angular.toJson(payload));
      message.destinationName = destination;
      self.client.send(message);
    }

    return {
      messages: messages,
      submit: submit,
      connect: connect,
      subscribe: subscribe,
      connected: connected,
      callbacks: callbacks
    }
  }

  function TsService($log, $http, BeerDukeSettings) {
    var url = BeerDukeSettings.values.tsUrl;

    function giveBeer() {
      if (!url) {
        return;
      }
      $http.get(url + '/GiveBeer').then(function () {
        $log.info('beer dispensed!')
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
      connected: BeerDukeService.connected
    }
  }

  angular.module('BeerDuke', ['ngRoute'])
    .factory('BeerDukeService', BeerDukeService)
    .factory('TsService', TsService)
    .factory('BeerDukeSettings', BeerDukeSettings)
    .config(config)
    .run(run);
}());
