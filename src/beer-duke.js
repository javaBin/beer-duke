import angular from 'angular';

function run() {
  function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe("/World");
    let message = new Paho.MQTT.Message("Hello");
    message.destinationName = "/World";
    client.send(message);
  }

  function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0)
      console.log("onConnectionLost:" + responseObject.errorMessage);
  }

  function onMessageArrived(message) {
    console.log("onMessageArrived:" + message.payloadString);
    client.disconnect();
  }

  //let client = new Paho.MQTT.Client("trygvis.io", 9001, "/", "clientId");
  let client = new Paho.MQTT.Client("wss://trygvis.io:9001/", "clientId");
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;
  client.connect({onSuccess: onConnect});
}

angular.module('BeerDuke', [])
  .run(run);
