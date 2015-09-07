var Room = function(id, owner, gameObj) {
   // Signifies if this room is accepting 
   this.accepting = true;
   // Signifies if the game has begun yet
   this.active = false;
   
   this.id = id;
   this.owner = owner;
   
   // <playerName>:<Player>
   this.connectedPlayers = {};
   this.numConnectedPlayers = 0;
   this.title = gameObj.title === '' ? this.baseGame : gameObj.title;
   
   this.baseGame = gameObj.baseGame;
   this.modules = gameObj.modules;
   
   this.targetPlayers = parseInt(gameObj.targetPlayers);
   this.autofill = gameObj.autofill;
   this.numHumans = parseInt(gameObj.numHumans);
   
   this.url = gameObj.url;
   this.serverUrl = gameObj.serverUrl;
   this.externalCode = null;
}

/* Returns if this room should appear in the 'available rooms' list */
Room.prototype.acceptingPlayers = function() {
   return this.accepting;
};

/* Verifys each name is unique (flaw of site but whatever) */
Room.prototype.doesNameExist = function(name) {
   for (var key in this.connectedPlayers) {
      if (name === key)
         return true;
   }
   
   return false;
};

/* When a client wants to connect to this room */
Room.prototype.connect = function(socket) {
   
   if (this.numConnectedPlayers === this.numHumans)
      return false;
   
   var self = this;
   socket.on("chat_message", self.sendChat);
   
   this.connectedPlayers[socket.name] = socket;
   this.numConnectedPlayers++;
   
   this.updateConnections();
   
   return true;
};

/* Updates the userlist in the room */
Room.prototype.updateConnections = function() {
   var sockets = [];
   var names = [];
   
   // Build the list of sockets and names
   for (var key in this.connectedPlayers) {
      var sock = this.connectedPlayers[key];
      sockets[sockets.length] = sock;
      names[names.length] = sock.name;
   }
   
   // Emit the list of names to each socket
   sockets.forEach(function(socket) {
      socket.emit('player_list_update', names);
   });
};




Room.prototype.verifyAndLaunch = function() {
   if (this.autofill) {
      // Add AI until targetPlayers is met
      
   } else {
      // Have enough people joined the game?
      if ( !(this.numConnectedPlayers === this.numHumans) )
         return false;
   }
   
   
   // Perform the launch part
   
   this.accepting = false;
   this.active = true;
   
   var self = this;
   for (var key in this.connectedPlayers) {
      var socket = this.connectedPlayers[key];
      
      socket.inGame = true;
      
      this.ready = 0;
      
      socket.on('ready', function() {
         self.ready++;
         
         if (self.ready === self.numConnectedPlayers) {
            self.kickItOff();
         }
      });
      
      socket.emit('start_game', self.url);
   };
};

Room.prototype.kickItOff = function() {
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
   
   // Start the server code
   var req = require("./" + this.serverUrl);
   this.externalCode = new req(this);
   
};


Room.prototype.addAI = function(socket, ai_id) {
   this.externalCode.addAI(socket, ai_id);
};

Room.prototype.sendChat = function(msg) {
   // Scope problems
   var that = this.room;
   
   //console.log(that);
   
   for (var socketKey in that.connectedPlayers) {
      var socket = that.connectedPlayers[socketKey];
      socket.emit('chat_message', msg);
   };
};

Room.prototype.sendChatClient = function(msg) {
   for (var socketKey in this.connectedPlayers) {
      var socket = this.connectedPlayers[socketKey];
      socket.emit('chat_message', msg);
   };
};



Room.prototype.closeRunningGame = function() {
   this.kickAll();
   
   this.externalCode.closeAI();
};

/* When a socket disconnects */
Room.prototype.disconnect = function(socket) {
   
   socket.removeListener("chat_message", this.sendChat);
   
   delete this.connectedPlayers[socket.name];
   this.numConnectedPlayers--;
   this.updateConnections();
   
   if (socket.name === this.owner)
      this.kickAll();
   
};

/* If the owner leaves a room, all others need to get kicked */
Room.prototype.kickAll = function() {
   var self = this;
   for (var key in this.connectedPlayers) {
      var socket = this.connectedPlayers[key];
      socket.emit('room_closed', self.active);
      this.disconnect(socket);
   };
};

/* Returns the number of players waiting in a room */
Room.prototype.isEmpty = function() {
   return this.numConnectedPlayers === 0;
};



Room.prototype.toObject = function() {
   return {owner: this.owner,
           baseGame: this.baseGame,
           modules: this.modules,
           id: this.id,
           numHumans: this.numHumans,
           inQueue: this.numConnectedPlayers,
           title: this.title,
           autofill: this.autofill,
           targetPlayers: this.targetPlayers
          };
};

module.exports = Room;