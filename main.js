const https = require('https');
const crypto = require('crypto');

function request(method = 'GET', path = '', headers = {}, data = {}) {
  return new Promise((cb, errCb) => {
    https.request({
      method,
      hostname: 'openapi.tuyaeu.com',
      path: `/v1.0/${path}`,
      headers,
      maxRedirects: 20,
    }, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('error', () => {
        errCb(new Error('Request error'));
      });
      res.on('end', () => {
        try {
          data = JSON.parse(data);
        } catch (err) {
          errCb(new Error('Can\'t parse server response'));
        }
        if (typeof data === 'object') cb(data);
      });
    }).end(JSON.stringify(data));
  });
}

function Requester(clientID, secret) {
  function calcSign(t) {
    return crypto.createHmac('sha256', secret).update(`${clientID}${t}`).digest('hex').toUpperCase();
  }
  function calcSign2(t) {
    return crypto.createHmac('sha256', secret).update(`${clientID}${accessToken}${t}`).digest('hex').toUpperCase();
  }

  let refreshToken = '';
  let accessToken = '';
  let expireToken = 0;

  async function getRefreshToken() {
    const t = Date.now();
    const sign = calcSign(t);

    const rs = await request('GET', `token/${refreshToken}`, {
      client_id: clientID,
      t, sign,
      sign_method: 'HMAC-SHA256',
    });

    if (rs.result && rs.result.access_token && rs.result.refresh_token) {
      refreshToken = rs.result.refresh_token;
      accessToken = rs.result.access_token;
      expireToken = t + (rs.result.expire_time * 1000);
      return;
    } else {
      throw new Error('Can\'t refresh token');
    }
  }

  return {
    async getAccessToken() {
      const t = Date.now();
      const sign = calcSign(t);

      const rs = await request('GET', 'token?grant_type=1', {
        client_id: clientID,
        t, sign,
        sign_method: 'HMAC-SHA256',
      });

      if (rs.result && rs.result.access_token && rs.result.refresh_token) {
        refreshToken = rs.result.refresh_token;
        accessToken = rs.result.access_token;
        expireToken = t + (rs.result.expire_time * 1000);
        return rs;
      } else {
        throw new Error('Can\'t get token');
      }
    },

    async rq(deviceId, path = '', method = 'GET', data = {}) {
      if (Date.now() > expireToken) await getRefreshToken();

      const t = Date.now();
      const sign = calcSign2(t);

      return request(method, `devices/${deviceId}${path}`, {
        client_id: clientID,
        t, sign,
        access_token: accessToken,
        sign_method: 'HMAC-SHA256',
      }, data);
    },
  };
}

module.exports = {
  connect(credentials = { clientID: '', secret: '' }) {
    return new Promise(async (cb, errCb) => {
      if (!credentials || !credentials.clientID || !credentials.secret) {
        errCb(new Error('Please specify Tuya Cloud "Client ID" and "Secret"'));
        return;
      }

      const requester = new Requester(credentials.clientID, credentials.secret);

      const accesToken = await requester.getAccessToken();

      if (!accesToken.success) {
        errCb(new Error('Wrong "Cloud ID" or "Secret"'));
        return;
      }

      cb({
        device(deviceId) {
          return {
            async getInfos() {
              return (await requester.rq(deviceId)).result;
            },
            async getStatus() {
              return (await requester.rq(deviceId, '/status')).result;
            },
            async getFunctions() {
              return (await requester.rq(deviceId, '/functions')).result;
            },
            async sendCommands(commands) {
              return (await requester.rq(deviceId, '/commands', 'POST', { commands }));
            },
          }
        },
      });
    });
  },
};
