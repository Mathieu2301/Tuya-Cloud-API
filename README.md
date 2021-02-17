# Tuya Cloud API
 API for Tuya Cloud

 No dependencies 💪

___
## Installation

```
npm i tuya-cloud
```

## Example (test.js)

```javascript
const tuyaCloud = require('tuya-cloud');

tuyaCloud.connect({
  clientID: 'xxxxxxxxxxxxxxxxxxxx',
  secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
}).then(async (tuya) => {
  console.log('Logged !')

  const tempSensor = tuya.device('xxxxxxxxxxxxxxxxxxxxxx');

  setInterval(async () => {
    console.log(await tempSensor.getInfos());
    console.log(await tempSensor.getStatus());
  }, 10000);

}).catch((error) => {
  console.error(error.message);
});

```

___
## Problems

 If you have errors in console or unwanted behavior, just reload the page.
 If the problem persists, please create an issue [here](https://github.com/Mathieu2301/Tuya-Cloud-API/issues).
