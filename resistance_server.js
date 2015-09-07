var _game = require('./resistance_game');
var _ai = require('./resistance_ai');

var self = null;

/* Constructor for the server code of the Resistance */
var res_server = function(room) {
   // Quick fix for scoping issues
   self = this;
   
   // Setting up variables for the game
   this.room = room;
   this.game = new _game.Game();
   this.connected_ai = [];
   this.sockets = {};
   this.num = 0; // Number of sockets
   
   // Spin up enough AI for the game
   var num_ai = room.targetPlayers - room.numConnectedPlayers;
   while (num_ai > 0) {
      var ndx = this.connected_ai.length;
      this.connected_ai[ndx] = new _ai.AI(ndx, this.game, room.id);
      --num_ai;
   }
   
   // Add each socket to the game
   for (var key in room.connectedPlayers) {
      var socket = room.connectedPlayers[key];
      
      this.game.addUser(socket.name);
      this.sockets[socket.name] = socket;
      this.num++;
      
      self.applyNewSocket(socket);
   };
};

/* Function to add an AI to the game */
res_server.prototype.addAI = function(socket, ai_id) {
   socket.name = self.connected_ai[ai_id].NAME;
   
   self.game.addUser(socket.name);
   self.sockets[socket.name] = socket;
   self.num++;
   
   self.applyNewSocket(socket);
};

/* Deletes all AI */
res_server.prototype.closeAI = function() {
   this.connected_ai.forEach(function(ai) {
      ai.terminate();
   });
};


/* Adds the required 'on' calls to each socket */
res_server.prototype.applyNewSocket = function(socket) {
   
   /* When a user submits a possible team list */
   socket.on('team_list', function(team) {
      if (self.game.correctNumberOnTeam(team.length)) {
         emit('vote_team', team);
         self.team_list = team;
      } else {
         socket.emit('violation', "Wrong number of people on team");
      }
   });
   
   /* When each user votes on if a team should go on a mission */
   socket.on('vote', function(choice) {
      // Submit the current vote.  When everybody has voted, enter the block
      if (self.game.teamVote(choice)) {
         // Tell the chat the result of the vote
         sendGameChat(self.game.teamVoteStats() + " YES votes out of " + self.game.getNumUsers());
         
         // Then tell each client the result of the vote
         var result = self.game.getVoteResult();
         emit('team_vote_result', result, self.team_list);
         if (result) {
            // Inform the clients of the team if successfully voted
            sendGameChat('Mission: ' + self.team_list);
         } else {
            advanceVote();
         }
      }
   });
   
   /* Each member on a mission will PASS or FAIL it */
   socket.on('mission', function(res) {
      // Submit the vote for the current mission.  When everybody has voted, enter the block
      if (self.game.mission(res)) {
         
         var numFails = self.game.missionVoteStats();
         var numAgents = self.game.getNumberOfAgents();
         
         // Tell the chat the results of the mission
         sendGameChat(numFails + ' FAIL votes out of ' + numAgents);
         // Also emit to the AI the exact results of the mission
         emit('AI_mission', numFails, numAgents);
         
         // Check to see if there is a winner
         var winningTeam = self.game.getWinner();
         if (winningTeam !== -1) {
            victory(winningTeam);
            return;
         }
         
         // If no winner, tell the clients
         var result = self.game.missionResult();
         emit('mission_result', result);
         
         advanceRound();
      }
   });
   
   /**********************/
   
   // To update the client's scores
   socket.on('update_scores', function() {
      socket.emit('updated_scores', self.game.getNumResistanceWins(), self.game.getNumSpyWins());
   });
   
   
   // Once all players and AI are setup
   
   if (self.num === self.room.targetPlayers) {
      resetGame();
   }
   
};

function resetGame() {
   self.game.newGame();
   
   sendGameChat('# of Resistance: ' + self.game.getNumResistance());
   sendGameChat('# of Spies: ' + self.game.getNumSpies());
   
   for (var key in self.sockets) {
      var socket = self.sockets[key];
      
      var role = self.game.getRole(socket.name);
      if (role === 'SPY') {
         socket.emit('role', key, role, self.game.getSpies());
      } else {
         socket.emit('role', key, role);
      }
   };
   
   advanceRound();
};

function advanceRound() {
   if (self.game.nextRound()) {
      victory(game.getWinner());
      return;
   }
   
   newLeader();
   emit('updated_scores', self.game.getNumResistanceWins(), self.game.getNumSpyWins());
};

function advanceVote() {
   if (self.game.nextVote()) {
      victory(0);
      return;
   }
   
   newLeader();
};

function newLeader() {
   var leader = self.game.getRoundLeader();
   
   self.sockets[leader].emit('leader', self.game.getUsers(), self.game.getNumberOfAgents());
   emit('curr_leader', leader, self.game.getRoundNumber(), self.game.getVoteNumber());
   
   
   sendGameChat('****************************');
   sendGameChat('New Captain: ' + leader);
   sendGameChat('--------------------------------');
   
};

function victory(team) {
   emit('victory', team);
   var users = self.game.getUsers();
   
   sendGameChat('***---***---***---');
   
   var userText = "";
   users.forEach(function(val) {
      userText += val.name + ' is ' + val.role + ' || ';
   });
   
   sendGameChat(userText);
};

function sendGameChat(msg) {
   self.room.sendChatClient('GAME-> ' + msg);
};


function emit(msg, param1, param2, param3) {
   for (var key in self.sockets) {
      var socket = self.sockets[key];
      socket.emit(msg, param1, param2, param3);
   };
};

module.exports = res_server;