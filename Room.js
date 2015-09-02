var Room = function(id, owner, gameObj) {
   this.id = id;
   this.owner = owner;
   
   this.baseGame = gameObj.baseGame;
   this.modules = gameObj.modules;
   this.numAI = parseInt(gameObj.numAI);
   this.numHumans = parseInt(gameObj.numHumans);
   this.title = gameObj.title === '' ? this.baseGame : gameObj.title;
   this.targetPlayers = parseInt(gameObj.targetPlayers);
   this.autofill = gameObj.autofill;
   
   this.url = gameObj.url;
   
   this.serverUrl = gameObj.serverUrl;
   
   this.connectedPlayers = [];
   this.connectedPlayerNames = [];
   
   this.active = false;
   
   
   this.externalCode = null;
}

Room.prototype.numPlayers = function() {
   return this.connectedPlayers.length;
};

Room.prototype.verifyAndLaunch = function() {
   if (this.autofill) {
      // Add AI until targetPlayers is met
      
   } else {
      // Have enough people joined the game?
      if ( !(this.numPlayers() === this.numHumans) )
         return false;
   }
   
   return true;
};

Room.prototype.addAI = function(socket, ai_id) {
   this.externalCode.addAI(socket, ai_id);
};

Room.prototype.sendChat = function(msg) {
   connectedPlayers.forEach(function(socket) {
      socket.emit('chat_message', msg);
   });
};

Room.prototype.takeTheReins = function() {
   /** Section to reload games **/
   var toDel = [];
   for (var key in require.cache) {
      if (key.indexOf(this.serverUrl) > -1) {
         toDel[toDel.length] = key;
      }
   }
   toDel.forEach(function(val) {
      delete require.cache[val];
   });
   /** End of section to reload games **/
      
   this.externalCode = require("./" + this.serverUrl);
   var self = this;
   
   this.active = true;
   
   this.externalCode.init_server(this.connectedPlayers, this.id, this.numAI, this.targetPlayers, this.sendChat);
   
   this.connectedPlayers.forEach(function(socket) {
      socket.emit('start_game', self.url);
   });
};

Room.prototype.closeRunningGame = function() {
   this.kickAll();
   
   this.externalCode.closeAI();
};

Room.prototype.updateConnections = function() {
   for (var ndx in this.connectedPlayers) {
      var sock = this.connectedPlayers[ndx];
      sock.emit('player_list_update', this.connectedPlayerNames);
   }
};

Room.prototype.connect = function(socket) {
   
   if (this.connectedPlayers.length === this.numHumans)
      return false;
   
   this.connectedPlayers[this.connectedPlayers.length] = socket;
   this.connectedPlayerNames[this.connectedPlayerNames.length] = socket.name;
   this.updateConnections();
   
   return true;
};

Room.prototype.disconnect = function(socket) {
   
   var ndx = -1;
   for (var i = 0; i < this.connectedPlayers.length; ++i) {
      if (this.connectedPlayers[i].uid === socket.uid) {
         ndx = i;
      }
   }
   
   this.connectedPlayers.splice(ndx, 1);
   this.connectedPlayerNames.splice(ndx, 1);
   this.updateConnections();
   
   if (socket.name === this.owner)
      this.kickAll();
   
};

Room.prototype.kickAll = function() {
   var self = this;
   this.connectedPlayers.forEach(function(socket) {
      socket.emit('room_closed', self.active);
      self.disconnect(socket);
   });
};

Room.prototype.toObject = function() {
   return {owner: this.owner,
           baseGame: this.baseGame,
           modules: this.modules,
           id: this.id,
           numAI: this.numAI,
           numHumans: this.numHumans,
           inQueue: this.numPlayers(),
           title: this.title,
           autofill: this.autofill,
           targetPlayers: this.targetPlayers
          };
};

module.exports = Room;