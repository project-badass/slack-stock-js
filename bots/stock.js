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
      var symbols = [];
      url = 'https://api.iextrading.com/1.0/stock/market/batch?types=quote&symbols=';
      for (var i = 0; i < matches.length; i++) {
        if (i > 0) {
          url += ',';
        }
        
        var symbol = matches[i].replace('$', '').toUpperCase();
        url += symbol;
        symbols.append(symbol);
      }
      
      
      Wreck.get(url, function (err, res, payload) {
        if (!err) {
          var json = JSON.parse(payload);
          var text = '';
          
          for (var i = 0; i < symbols.length; i++) {
            if (i > 0) {
              text += '\n';
            }
            
            var symbol = symbols[i];
            var stockResponse = json[symbol];
            if (stockResponse.quote) {
              text += formatQuote(stockResponse.quote);
            } else {
              text += formatQuote(null);
            }
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
  if (quote.bid_price) {
    var change = quote.change
    if (change == 0) {
      // equal
      emoji = ':point_right:';
    } else if (change > 0) {
      // gains
      emoji = ':point_up_2:'
    } else {
      // losses
      emoji = ':point_down:';
    }
    return emoji + ' *' + quote.companyName + '* (' + quote.symbol + '): ' + quote.latestPrice + ' (_' + change + ' ' + quote.changePercent + '%_)';
  }

  return ':question: *' + quote.symbol + '*: Symbol not found or quote unavailable';
}
