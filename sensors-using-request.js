var http = require('http');
http.globalAgent.maxSockets = 500;

var request = require('request');

var LCD = require('jsupm_i2clcd');
var myLcd = new LCD.Jhd1313m1 (0, 0x3E, 0x62);
myLcd.setCursor(0,0);
myLcd.setColor(238, 079, 126);
myLcd.write('pebble {code}');
myLcd.setCursor(1,2);
myLcd.write('IoT 2016');

var mraa = require('mraa');
var soundSensor = new mraa.Aio(2);
var vibrationPin = new mraa.Aio(3);

// Load Grove
var groveSensor = require('jsupm_grove');
var temp = new groveSensor.GroveTemp(0);
var light = new groveSensor.GroveLight(1);

// Load accelerometer
var digitalAccelerometer = require('jsupm_mma7660');

// Instantiate an MMA7660 on I2C bus 0
var myDigitalAccelerometer = new digitalAccelerometer.MMA7660(
          digitalAccelerometer.MMA7660_I2C_BUS,
          digitalAccelerometer.MMA7660_DEFAULT_I2C_ADDR);

// place device in standby mode so we can write registers
myDigitalAccelerometer.setModeStandby();

// enable 64 samples per second
myDigitalAccelerometer.setSampleRate(digitalAccelerometer.MMA7660.AUTOSLEEP_64);

// place device into active mode
myDigitalAccelerometer.setModeActive();

var x, y, z;
x = digitalAccelerometer.new_intp();
y = digitalAccelerometer.new_intp();
z = digitalAccelerometer.new_intp();

var ax, ay, az;
ax = digitalAccelerometer.new_floatp();
ay = digitalAccelerometer.new_floatp();
az = digitalAccelerometer.new_floatp();

// data store
var accelerometerOutput;

function lightSensor() {
  return light.value();
}

function temperature() {
  var celsius = temp.value();
  return celsius;
}

function sound() {
  return soundSensor.read();
}

function accelerometer() {

  function roundNum (num, decimalPlaces) {
    var extraNum = (1 / (Math.pow(10, decimalPlaces) * 1000));
    return (Math.round((num + extraNum)
      * (Math.pow(10, decimalPlaces))) / Math.pow(10, decimalPlaces));
  }

  myDigitalAccelerometer.getAcceleration(ax, ay, az);

  // x,y,z
  accelerometerOutput = {
    x: roundNum(digitalAccelerometer.floatp_value(ax), 6),
    y: roundNum(digitalAccelerometer.floatp_value(ay), 6),
    z: roundNum(digitalAccelerometer.floatp_value(az), 6)
  };

  return accelerometerOutput;
}

function vibration(){
  return vibrationPin.read();
}

function update() {
  var temperatureValue = temperature(),
      lightValue = lightSensor(),
      soundValue = sound(),
      vibrationValue = vibration(),
      accelerometerValue = accelerometer();

  request.post('http://pebblecode-iot-hack.herokuapp.com/data', {
    body: JSON.stringify({
      temperature: temperatureValue,
      light: lightValue,
      sound: soundValue,
      vibration: vibrationValue,
      accelerometer: accelerometerValue
    })
  }, function (err, headers) {
    if (err) {
      return console.log(err);
    }

    // console.log(headers.statusCode);
  });
}

update();

var INTERVAL = 500;
var intervalId = setInterval(update, INTERVAL);

process.on('SIGINT', function () {
  clearInterval(intervalId);

  // clean up memory
  digitalAccelerometer.delete_intp(x);
  digitalAccelerometer.delete_intp(y);
  digitalAccelerometer.delete_intp(z);

  digitalAccelerometer.delete_floatp(ax);
  digitalAccelerometer.delete_floatp(ay);
  digitalAccelerometer.delete_floatp(az);

  myDigitalAccelerometer.setModeStandby();

  console.log("Exiting...");
  process.exit(1);
});