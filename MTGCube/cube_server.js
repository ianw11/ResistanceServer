var self = null;

var _drafter = require('./drafting_driver');

/* Constructor for the server code of Cube Draft */
var cube_server = function(room, game_info) {
   
   // Quick fix for scoping issues
   self = this;
   
   this.room = room;
   this.game_info = game_info;
};

cube_server.prototype.start = function() {
   
   // Setting up variables for the game
   this.sockets = {};
   this.numSockets = 0;
   
   this.names = [];
   
   for (var key in this.room.connectedPlayers) {
      var socket = this.room.connectedPlayers[key];
      
      this.sockets[socket.name] = socket;
      this.names[this.names.length] = socket.name;
      this.numSockets++;
      
      self.applyNewSocket(socket);
   }
};

cube_server.prototype.closeAI = function() {
   
};

cube_server.prototype.applyNewSocket = function(socket) {
   
   var self = this;
   
   socket.on('start_draft', function() {
      // Kick off game
      resetDraft();
   });
   
   if (self.numSockets === self.room.targetPlayers) {
      var cube_file = self.game_info.client_files.cube;
      var oracle_file = self.game_info.client_files.oracle;
      self.drafter = new _drafter(cube_file, oracle_file, self.names);
      
      emit('connected_players', self.names);
   }
};



function resetDraft() {
   sendGameChat("Resetting draft");
   emit('starting_draft');
   
   self.drafter.newDraft(function() {
      emitCurrentPacks();
   });
}

function emitCurrentPacks() {
   for (var ndx in self.names) {
      var socket = self.sockets[self.names[ndx]];
      socket.emit('new_pack', self.drafter.getPackFor(ndx));
   }
};

function emit(msg, param1) {
   for (var key in self.sockets) {
      var socket = self.sockets[key];
      socket.emit(msg, param1);
   }
};

function sendGameChat(msg) {
   self.room.sendChatClient('GAME-> ' + msg);
};

module.exports = cube_server;
