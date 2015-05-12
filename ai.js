module.exports = {
   AI: function(id, game, messenger) {
      var io = require('./lib/socket.io-client');
      var socket = io.connect();
      
      
      console.log("New AI created -- id: " + id);
      this.id = id;
      this.game = game;
      
      this.emit = function() {
         messenger(this.id, arguments);
      }
      
      
      this.printRound = function() {
         console.log(currGame.getRoundNumber());
      }
      
      // This function accepts messages from the server
      this.inbound = function() {
         switch (arguments[0]) {
            case 'connection':
               console.log("AI connection successful");
               break;
            case "game_started":
               console.log("Ai recognizes game has started");
               break;
            default:
               console.log("Ignoring message: " + arguments[0]);
               break;
         }
      }
      
   }
};