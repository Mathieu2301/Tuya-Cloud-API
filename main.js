const https = require('https');
const crypto = require('crypto');

function Requester(clientID, secret, region) {
  function request(method = 'GET', path = '', headers = {}, data = {}) {
    return new Promise((cb, errCb) => {
      https.request({
        method,
        hostname: `openapi.tuya${region}.com`,
        path: `/v1.0/${path}`,
        headers,
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

  function calcSign(t, token = '') {
    return crypto.createHmac('sha256', secret).update(`${clientID}${token}${t}`).digest('hex').toUpperCase();
  }

  const session = {
    token: '',
    expire: 0,
  };

  return {
    async getAccessToken() {
      const t = Date.now();
      const sign = calcSign(t);

      const rs = await request('GET', 'token?grant_type=1', {
        client_id: clientID,
        t, sign,
        sign_method: 'HMAC-SHA256',
      });

      if (rs.result && rs.result.access_token) {
        session.token = rs.result.access_token;
        session.expire = t + (rs.result.expire_time * 1000);
      }

      return rs;
    },

    async rq(deviceId, path = '', method = 'GET', data = {}) {
      if (Date.now() > session.expire) await this.getAccessToken();

      const t = Date.now();
      const sign = calcSign(t, session.token);

      return request(method, `devices/${deviceId}${path}`, {
        client_id: clientID,
        t, sign,
        access_token: session.token,
        sign_method: 'HMAC-SHA256',
      }, data);
    },
  };
}

module.exports = {
  connect(credentials = { clientID: '', secret: '', region: '' }) {
    return new Promise(async (cb, errCb) => {
      if (!credentials || !credentials.clientID || !credentials.secret) {
        errCb(new Error('Please specify Tuya Cloud "Client ID" and "Secret"'));
        return;
      }

      if (!credentials.region) credentials.region = 'eu';
      const requester = new Requester(
        credentials.clientID,
        credentials.secret,
        credentials.region,
      );

      const accesToken = await requester.getAccessToken();

      if (!accesToken.success) {
        errCb(new Error(`Can't login to API: ${accesToken.msg}`));
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
