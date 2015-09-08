(function () {
  'use strict';

  function SettingsController($log, $location, BeerDukeSettings) {
    var ctrl = this;

    ctrl.clientId = BeerDukeSettings.clientId();
    ctrl.showSettings = BeerDukeSettings.showSettings();

    ctrl.save = function () {
      BeerDukeSettings.clientId(ctrl.clientId);
      BeerDukeSettings.showSettings(ctrl.showSettings);
      BeerDukeSettings.save();

      $location.path('/')
    }
  }

  function BeerDukeSettings() {

    function save() {
      store('clientId', clientId_);
      store('showSettings', showSettings_);
    }

    function store(key, value) {
      window.localStorage[key] = angular.toJson(value);
      return value;
    }

    function load(key) {
      var x = window.localStorage[key];
      if (typeof x === 'undefined') {
        return x;
      }

      return angular.fromJson(x);
    }

    var clientId_ = load('clientId') || 'beer-duke-' + Math.round(Math.random() * 100000);
    var showSettings_ = load('showSettings') || false;
    save();

    function clientId(x) {
      if (x) {
        clientId_ = x;
      }
      return clientId_;
    }

    function showSettings(x) {
      if (x) {
        showSettings_ = x;
      }
      return showSettings_;
    }

    return {
      clientId: clientId,
      showSettings: showSettings,
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
      var clientId = BeerDukeSettings.clientId() + "-" + type;
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
    $rootScope.settings = BeerDukeSettings;
    $rootScope.mqtt = {
      connected: BeerDukeService.connected
    }
  }

  angular.module('BeerDuke', ['ngRoute'])
    .factory('BeerDukeService', BeerDukeService)
    .factory('BeerDukeSettings', BeerDukeSettings)
    .config(config)
    .run(run);
}());
