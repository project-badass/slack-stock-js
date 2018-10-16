module.exports = {
  path:    '/stock',
  handler: function(request, reply) {

    // Slack Payload Cheatsheet
    // {
    //    token=gT0R4UDPjbBzvYSll5aPtS6Z
    //    team_id=T0001
    //    team_domain=example
    //    channel_id=C2147483705
    //    channel_name=test
    //    timestamp=1355517523.000005
    //    user_id=U2147483697
    //    user_name=Steve
    //    text=googlebot: What is the air-speed velocity of an unladen swallow?
    //    trigger_word=googlebot:
    // }
    var Wreck = require('wreck');
    var msg = request.payload;

    // Suppose you only want to respond to messages that match a certain criteria
    var matches = msg.text.match(/\$[A-Za-z.]+/g);
    if (matches) {
      body = '';
      url = 'https://api.robinhood.com/quotes/?symbols=';
      for (var i = 0; i < matches.length; i++) {
        if (i > 0) {
          url += ',';
        }
        url += matches[i].replace('$', '');
      }
      
      console.log('fetch: ' + url);
      Wreck.get(url, function (err, res, payload) {
        if (!err) {
          var json = JSON.parse(payload);
          var text = '';
          var stockResponse = json.query.results.quote;
          if (Array.isArray(stockResponse)) {
            for (var i = 0; i < stockResponse.length; i++) {
              if (i > 0) {
                text += '\n';
              }
              var quote = stockResponse[i];
              text += formatQuote(quote);
            }
          } else {
            text += formatQuote(stockResponse);
          }

          return reply({
            'text': text
          }).code(200);
        }
      });
    } else {
      // This is not the msg you're looking for.
      return reply().code(204);
    }
  }
};

var formatQuote = function(quote) {
  if (quote.LastTradePriceOnly) {
    if (!quote.Change || quote.Change == '+0.00') {
      emoji = ':point_right:';
    } else {
      emoji = quote.Change.charAt(0) == '+' ? ':point_up_2:' : ':point_down:';
    }
    return emoji + ' *' + quote.symbol + '*: ' + quote.LastTradePriceOnly + ' (_' + quote.Change + '_)';
  }

  return ':question: *' + quote.symbol + '*: Symbol not found or quote unavailable';
}
