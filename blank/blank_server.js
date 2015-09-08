var AI = require('./blank_ai');

var self = null;

var Blank = function(room) {
   // Keeping this as the first line guarantees scope
   self = this;
   
   this.room = room;
};

Blank.prototype.start = function(game) {
   // Add each person from the room and all AI to this object
   this.sockets = {};
   this.num = 0;
   // Add each socket to the local list of sockets
   for (var key in this.room.connectedPlayers) {
      var socket = this.room.connectedPlayers[key];
      applySocket(socket);
   };
   
   // Create a list of AI that can be deleted later
   this.connected_ai = [];
   var num_ai = this.room.targetPlayers - this.room.numConnectedPlayers;
   while (num_ai > 0) {
      var ndx = this.connected_ai.length;
      this.connected_ai[ndx] = new AI(ndx, this.game, room.id);
      --num_ai;
   }
   
   // Add code below for everything else
};

Blank.prototype.addAI = function(socket, aiID) {
   var ai = this.connected_ai[aiID];
   socket.name = ai.NAME;
   
   applySocket(socket);
};

Blank.prototype.closeAI = function() {
   self.connected_ai.forEach(function(ai) {
      ai.terminate();
   });
};


function applySocket(socket) {
   self.sockets[socket.name] = socket;
   self.num++;
   
};


function sendGameChat(msg) {
   self.room.sendChatClient('GAME-> ' + msg);
};

function emit(msg, val1, val2, val3) {
   for (var key in self.sockets) {
      var socket = self.sockets[key];
      socket.emit(msg, param1, param2, param3);
   };
};

module.exports = Blank;