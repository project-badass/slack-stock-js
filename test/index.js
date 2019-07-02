const test = require('tape');
const server = require('../lib/server')('0.0.0.0', 0);
const { ICONS } = require('../lib/constants');
const bots = require('../bots');
const stockHandler = require('../bots/stock').handler;
const Wreck = require('wreck');
const sinon = require('sinon');

test('server initializes and starts appropriately', function (t) {
  t.plan(2);

  server.route(bots);
  server.start(function() {

    t.pass('server started');
    server.stop(function(){

      t.pass('server stopped');
    });
  });
});

let stockApiStub;
const setUpStockAPI = (mockPayload, mockError) => {
  stockApiStub = sinon.stub(Wreck, 'get')
    .callsFake((url, cb) => {
      cb(mockError, {}, mockPayload);
    });
};

const tearDownStockAPI = () => {
  Wreck.get.restore();
};

test('stockbot does its fucking job when it should', (t) => {
  t.plan(2);

  setUpStockAPI(JSON.stringify({
    JAG: {
      quote: {
        symbol: 'JAG',
        companyName: 'NSJags, Inc',
        latestPrice: 7.25,
        change: -0.25,
        changePercent: -0.034
      }
    },
    FOO: {
      quote: {
        symbol: 'FOO',
        companyName: 'Foobar has a really long company name',
        latestPrice: 105.01,
        change: 5.01,
        changePercent: 0.0501
      }
    },
    BAR: {
      quote: {
        symbol: 'BAR',
        companyName: 'No Change, Inc',
        latestPrice: 3.15,
        change: 0,
        changePercent: 0
      }
    }
  }));

  const request = {
    payload: {
      text: 'What have $WTF, $JAG, $FOO, and $BAR been up to?'
    }
  };

  let responseText;
  let responseCode;
  const reply = (body) => {
    responseText = body.text;
    return {
      code: (code) => {
        responseCode = code;
      }
    }
  };

  stockHandler(request, reply);

  t.equal(
    responseText,
    [
      `${ICONS.STOCK_UP} *FOO* (Foobar has a re...): 105.01 (_5.01 5.01%_)`,
      `${ICONS.STOCK_EVEN} *BAR* (No Change, Inc): 3.15 (_0 0%_)`,
      `${ICONS.STOCK_DOWN} *JAG* (NSJags, Inc): 7.25 (_-0.25 -3.4%_)`,
      `${ICONS.STOCK_UNKNOWN} *WTF*: Symbol not found or quote unavailable`
    ].join('\n'),
    'should return properly formatted stock quotes'
  );

  t.equal(responseCode, 200, 'should return 200 status code');

  tearDownStockAPI();
});

test('stockbot shuts the fuck up when it should', (t) => {
  t.plan(2);

  setUpStockAPI({});

  const request = {
    payload: {
      text: 'Sup jags'
    }
  };

  let responseCode;
  const reply = () => {
    return {
      code: (code) => {
        responseCode = code;
      }
    };
  };

  stockHandler(request, reply);

  t.equal(responseCode, 204, 'should return 204 status code');
  t.notOk(stockApiStub.called, 'should not call stock API');

  tearDownStockAPI();
});

test('stockbot gracefully handles stock API errors', (t) => {
  t.plan(2);

  setUpStockAPI(null, { message: 'Some mock error' });

  const request = {
    payload: {
      text: '$FOO $BAR'
    }
  };

  let responseText;
  let responseCode;
  const reply = (body) => {
    responseText = body.text;
    return {
      code: (code) => {
        responseCode = code;
      }
    };
  };

  stockHandler(request, reply);

  t.ok(responseText.startsWith('Error'), 'should reply with an error message');
  t.equal(responseCode, 200, 'should return 200 status code');

  tearDownStockAPI();
});