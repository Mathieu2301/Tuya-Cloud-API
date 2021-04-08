const tuyaCloud = require('./main');
const readline = require('readline');
const fs = require('fs');

if (!fs.existsSync('./credentials.json') || !fs.statSync('./credentials.json').isFile()) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.clear();
  rl.question('What is your Tuya Cloud "Client ID" ? ', (clientID) => {
    console.clear();
    rl.question('What is your Tuya Cloud "Secret" ? ', (secret) => {
      console.clear();
      rl.question('What is your Tuya Cloud server region ? (eu / us / cn / in) ', (region) => {
        console.clear();
        rl.close();

        if (!clientID || !secret) process.exit(200);
        init({ clientID, secret, region }, true);
      });
    });
  });
} else {
  let credentials = null;
  try {
    credentials = JSON.parse(fs.readFileSync('./credentials.json', { encoding: 'utf8' }));
  } catch (error) {
    fs.unlinkSync('./credentials.json');
    console.error('Wrong "Cloud ID" or "Secret", please retry...');
    process.exit(200);
  }

  init(credentials);
}

function init(credentials, save = false) {
  tuyaCloud.connect(credentials).then(async (tuya) => {
    if (save) fs.writeFileSync('./credentials.json', JSON.stringify(credentials), { encoding: 'utf8' });

    console.log('Logged !')

    const tempSensor = tuya.device('xxxxxxxxxxxxxxxxxxxxxx');

    console.log(await tempSensor.getInfos());

    setInterval(async () => {
      console.log(await tempSensor.getStatus());
    }, 10000);

    const light = tuya.device('xxxxxxxxxxxxxxxxxxxxxx');

    console.log(await light.getFunctions());
    console.log(await light.getStatus());

    light.sendCommands([
      {
        code: 'colour_data',
        value: {
          h: 120, // Green
          s: 1000,
          v: 1000,
        },
      },
    ]);

  }).catch((error) => {
    if (fs.existsSync('./credentials.json')) fs.unlinkSync('./credentials.json');
    console.error(error.message);
  });
}

setInterval(() => {}, 2000);
