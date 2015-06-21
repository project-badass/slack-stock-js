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
    var matches = msg.text.match(/\$[A-Za-z]+/g);
    if (matches) {
      body = '';
      url = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(';
      for (var i = 0; i < matches.length; i++) {
        if (i > 0) {
          url += ',';
        }
        match = matches[i].replace('$', '');
        url += '%22' + match + '%22';
      }

      url += ')%0A%09%09&format=json&diagnostics=false&env=http%3A%2F%2Fdatatables.org%2Falltables.env&callback=';

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
          reply({
            'text': text
          }).code(200);
        }
      });
    } else {
      // This is not the msg you're looking for.
      reply().code(204);
    }
  }
};

var formatQuote = function(quote) {
  return quote.symbol + ': ' + quote.LastTradePriceOnly + ' (' + quote.Change + ')';
}
