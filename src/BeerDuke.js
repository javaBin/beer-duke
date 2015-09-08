import angular from 'angular';

class SettingsController {
  constructor(BeerDukeSettings) {
    this.settings = BeerDukeSettings;
  }
}

class BeerDukeSettings {
  constructor() {
    this.clientId = BeerDukeSettings.load('clientId') || 'beer-duke-' + Math.round(Math.random() * 100000);
    console.log('this =', this);
    this.showSettings = BeerDukeSettings.load('showSettings') == 'true' || false;
  }

  save() {
    BeerDukeSettings.store('clientId', clientId);
    BeerDukeSettings.store('showSettings', showSettings);
  }

  static store(key, value) {
    window.localStorage[key] = angular.toJson(value);
    return value;
  }

  static load(key) {
    let x = window.localStorage[key];
    console.log('key =', key, 'x =', x);
    return angular.fromJson(x);
  }
}

class BeerDukeService {
  constructor($timeout, $rootScope, BeerDukeSettings) {
    this.$timeout = $timeout;
    this.$rootScope = $rootScope;

    this.connected_ = false;
    this.messages = [];
  }

  static xxx() {
    return new BeerDukeSettings();
  }

  connect(type, opts) {
    this.opts = opts || {};

    console.log('BeerDukeSettings =', BeerDukeSettings);
    let clientId = BeerDukeSettings.clientId + "-" + type;
    console.log('clientId =', clientId);
    let client = new Paho.MQTT.Client("wss://trygvis.io:9001/", clientId);
    client.onConnectionLost = (a) => {
      this.$timeout(() => {
        this.$rootScope.$apply(() => {
          this.onConnectionLost(a);
        })
      });
    };
    client.onMessageArrived = (a) => {
      this.$timeout(() => {
        this.$rootScope.$apply(() => {
          this.onMessageArrived(a);
        })
      });
    };

    this.client = client;

    this.client.connect({
      onSuccess: () => {
        this.$timeout(() => {
          this.$rootScope.$apply(() => {
            this.onConnect();
          })
        });
      }
    });
  }

  get connected() {
    return this.connected_;
  }

  onConnect() {
    console.log('Connected');

    this.connected_ = true;

    if (this.opts.onConnect) {
      try {
        this.opts.onConnect();
      } catch (e) {
      }
    }

    //this.client.subscribe("/beer-duke");
  }

  onConnectionLost(responseObject) {
    this.connected_ = false;

    //if (responseObject.errorCode !== 0)
    console.log("onConnectionLost:", responseObject);
    console.log("onConnectionLost:", responseObject.errorMessage);
  }

  onMessageArrived(message) {
    console.log("onMessageArrived:" + message.payloadString);

    this.messages.push(message);

    if (this.opts.onMessageArrived) {
      try {
        let m = angular.fromJson(message);
        this.opts.onMessageArrived(m);
      } catch (e) {
      }
    }
  }

  requestBeer(code) {
    let message = new Paho.MQTT.Message(angular.toJson({code: code}));
    message.destinationName = "/beer-duke";
    this.client.send(message);
  }
}

class MqttController {
  constructor(BeerDukeService) {
    this.BeerDukeService = BeerDukeService;
  }

  get connected() {
    return this.BeerDukeService.connected;
  }
}

function config($routeProvider) {
  console.log('BeerDuke: config');
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
    get connected() {
      return BeerDukeService.connected
    }
  };
}

angular.module('BeerDuke', ['ngRoute'])
  .controller('MqttController', MqttController)
  .service('BeerDukeService', BeerDukeService)
  .factory('BeerDukeSettings', () => new BeerDukeSettings())
  .config(config)
  .run(run);
