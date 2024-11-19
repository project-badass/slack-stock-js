const Wreck = require('@hapi/wreck');
const { BASE_URL, CRYPTO_URL, ICONS } = require('../lib/constants');

// Slack Payload Cheatsheet:
/*
  {
    "token": "gT0R4UDPjbBzvYSll5aPtS6Z",
    "team_id": "T0001",
    "team_domain": "example",
    "channel_id": "C2147483705",
    "channel_name": "test",
    "timestamp": "1355517523.000005",
    "user_id": "U2147483697",
    "user_name": "Steve",
    "text": "prefix $ACB $ko $tchy $gwph $foobar suffix"
  }
*/

module.exports = {
  path:    '/stock',
  handler: async (request, h) =>  {
    const msg = request.payload;

    // find words prefixed with `$`
    const matches = msg.text.match(/\$[A-Za-z.=]+/g);
    const cryptoMatches = msg.text.match(/\#[A-za-z]+/g);

    if (matches && matches.length) {
      const symbols = matches.map(mapSymbol);
      let responses = {};
      await Promise.all(symbols.map(async (symbol) => {
        const url = BASE_URL + symbol;
        
        try {
          const { res, payload } = await Wreck.get(url);
          const json = JSON.parse(payload);
          responses[symbol] = json;
          console.log(json);
          console.log(responses);
        } catch (ex) {
          console.log(ex);
        }
      }));
      console.dir(responses);
      const text = symbols
                    .map((symbol) =>
                      (responses[symbol])
                        ? { change: responses[symbol].d, symbol: symbol, companyName: '', latestPrice: responses[symbol].c, changePercent: responses[symbol].dp }
                        : { symbol }
                    )
                    .sort(sortQuote)
                    .map(formatQuote)
                    .join('\n');
      return h.response({ text }).code(200);
    } else if (cryptoMatches && cryptoMatches.length) {
      const symbols = cryptoMatches.map(mapSymbol);
      const url = CRYPTO_URL + symbols.join(',');
      try {
        const { res, payload } = await Wreck.get(url);
        const json = JSON.parse(payload)['rates'];

        const text = symbols
          .map((symbol) =>
            json[symbol]
              ? { "symbol": symbol, "latestPrice": json[symbol], "type": "crypto" }
              : { symbol }
          )
          .sort(sortQuote)
          .map(formatQuote)
          .join('\n');

        return h.response({ text }).code(200);
      } catch (ex) {
        console.log(ex);
        return h.response({ text: 'Error: could not fetch quotes' }).code(200);
      }
    } else {
      // This is not the msg you're looking for.
      return h.response().code(204);
    }
  }
};

const formatQuote = (quote) => {
  if (quote.type && quote.type == "crypto") {
    let text = `${ICONS.CRYPTO} *${quote.symbol}*: `;
    if (!quote.latestPrice) text += 'Symbol not found';
    else text += quote.latestPrice
    return text;
  }
  const { change, symbol, companyName, latestPrice, changePercent } = quote;

  if (!isNumber(change)) {
    return `${ICONS.STOCK_UNKNOWN} *${quote.symbol}*: Symbol not found or quote unavailable`;
  }

  let emoji;
  if (change == 0) {
    // equal
    emoji = ICONS.STOCK_EVEN;
  } else if (change > 0) {
    // gainz
    emoji = ICONS.STOCK_UP;
  } else {
    // losses
    emoji = ICONS.STOCK_DOWN;
  }

  const formattedCompanyName = (companyName.length > 15)
    ? `${companyName.substring(0, 15)}...`
    : companyName;

  return `${emoji} *${symbol}* (${formattedCompanyName}): ${(Math.round(latestPrice * 100) / 100)} (_${change} ${changePercent}%_)`
};


const isNumber = (value) => {
  return (typeof value === 'number');
}

const mapSymbol = (raw) => {
  return encodeURI(raw.replace('$', '').replace('#', '').toUpperCase());
};

const sortQuote = (quoteA, quoteB) => {
  if (quoteA.type && quoteB.type && quoteA.type == 'crypto') {
    return quoteA.latestPrice == quoteB.latestPrice ? 0 : (quoteA.latestPrice > quoteB.latestPrice ? -1 : 1);
  }

  if (quoteA.changePercent === quoteB.changePercent) { return 0; }
  if (!isNumber(quoteA.changePercent)) { return 1; }
  if (!isNumber(quoteB.changePercent)) { return -1; }
  if (quoteA.changePercent < quoteB.changePercent) {
    return 1;
  }
  if (quoteA.changePercent > quoteB.changePercent) {
    return -1;
  }
  return 0;
};
