import angular from 'angular';
import 'angular-route';
import './BeerDuke.js';

class BeerDukeTapController {
  constructor($timeout, BeerDukeSettings) {
    console.log('BeerDukeTapController', this);

    this.$timeout = $timeout;
    this.settings = BeerDukeSettings;

    this.rotateCode();
    this.count = 0;
    this.code = '';
  }
   
  rotateCode() {
    this.code = '' + this.count++;
    this.$timeout(() => {
      this.rotateCode();
    }, 1000);
  }
}

class TapSettingsController {
  constructor() {
  }
}

function run(BeerDukeService) {
  BeerDukeService.connect('tap');
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
