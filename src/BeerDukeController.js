import angular from 'angular';
import 'angular-route';
import './BeerDuke.js';

class BeerDukeControllerController {
  constructor(BeerDukeService) {
    this.BeerDukeService = BeerDukeService;
  }

  requestBeer() {
    let code = this.code;

    console.log('code', code);
    this.BeerDukeService.requestBeer(code);
  }
}

function run(BeerDukeService) {
  BeerDukeService.connect('controller');
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
  .config(config)
  .controller('BeerDukeControllerController', BeerDukeControllerController);
