var BlankAI = function(id, game, room_id) {
   this.NAME = 'AI ' + id;
   this.id = id;
   this.game = game;
   
   /* This code deletes the existence of 'socket.io-client' from
   Node.js' require cache.
   
   The problem we ran into was that 'require' loads all code once and never
   again, which meant each AI had the same connection to the server.  This
   in turn meant whenever the server called 'socket.emit(...)' every single
   AI got the message instead of the desired target.
   
   By deleting entries from the cache, each AI has it's own discrete version
   of the client code.
   */
   var toDel = [];
   for (var key in require.cache) {
      if (key.indexOf('socket.io-client') > -1) {
         toDel[toDel.length] = key;
      }
   }
   toDel.forEach(function(val) {
      delete require.cache[val];
   });
   
   // With the cache ready, this AI object can load
   // the client code.
   var io = require('socket.io-client');
   this.socket = io.connect('http://localhost:3000');
   // Let the server know that this AI exists
   // And to add it to the right room
   this.socket.emit('ai', room_id, id);
   
   /**************************************************************************/
   
   // Begin setting up socket listeners for this AI here
   
};

BlankAI.prototype.terminate = function() {
   this.socket.disconnect();
};

module.exports = BlankAI;