import angular from 'angular';

class SettingsController {
  constructor(BeerDukeSettings) {
    this.settings = BeerDukeSettings;
  }
}

class BeerDukeSettings {
  constructor() {
    this.clientId = this.clientId || 'beer-duke-' + Math.round(Math.random() * 100000);
    this.showSettings = this.showSettings || false;
  }

  get clientId() {
    return BeerDukeSettings.load('clientId');
  }

  set clientId(clientId) {
    BeerDukeSettings.store('clientId', clientId);
  }

  get showSettings() {
    return BeerDukeSettings.load('showSettings');
  }

  set showSettings(showSettings) {
    BeerDukeSettings.store('showSettings', showSettings);
  }

  static store(key, value) {
    window.localStorage[key] = angular.toJson(value);
    return value;
  }

  static load(key) {
    return angular.fromJson(window.localStorage[key]);
  }
}

class BeerDukeService {
  constructor($timeout, $rootScope, BeerDukeSettings) {
    this.$timeout = $timeout;
    this.$rootScope = $rootScope;

    this.connected_ = false;
    this.messages = [];
  }

  connect(type) {
    let client = new Paho.MQTT.Client("wss://trygvis.io:9001/", BeerDukeSettings.clientId + "-" + type);
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

    this.client.subscribe("/beer-duke");
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
  .service('BeerDukeSettings', BeerDukeSettings)
  .config(config)
  .run(run);
