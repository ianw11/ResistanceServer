var _game = require('./resistance_game');
var _ai = require('./ai');

var self = null;

var res_server = function(room) {
   self = this;
   
   this.room = room;
   
   this.game = new _game.Game();
   
   this.numPlayers = room.targetPlayers;
   
   var num_ai = room.numAI;
   if (num_ai === -1) {
      num_ai = room.targetPlayers - room.numConnectedPlayers;
   }
   
   var room_id = room.id;
   this.connected_ai = [];
   while (num_ai > 0) {
      this.connected_ai[this.connected_ai.length] = new _ai.AI(this.connected_ai.length, this.game, room_id);
      
      --num_ai;
   }
   
   this.sockets = {};
   this.num = 0;
   for (var key in room.connectedPlayers) {
      var socket = room.connectedPlayers[key];
      
      this.game.addUser(socket.name);
      this.sockets[socket.name] = socket;
      this.num++;
      
      self.applyNewSocket(socket);
   };
};

res_server.prototype.addAI = function(socket, ai_id) {
   socket.name = 'Faker ' + ai_id;
   
   self.game.addUser(socket.name);
   self.sockets[socket.name] = socket;
   self.num++;
   
   self.connected_ai[ai_id].NAME = socket.name;
   
   self.applyNewSocket(socket);
};

res_server.prototype.closeAI = function() {
   connected_ai.forEach(function(ai) {
      ai.terminate();
   });
};






res_server.prototype.applyNewSocket = function(socket) {
   // team_list (submitting the mission team list)
   
   socket.on('team_list', function(team) {
      
      if (self.game.correctNumberOnTeam(team.length)) {
         emit('vote_team', team);
         self.team_list = team;
      } else {
         socket.emit('violation', "Wrong number of people on team");
      }
   });
   
   // vote
   socket.on('vote', function(choice) {
      // Submit the current vote
      if (self.game.teamVote(choice)) {
         
         sendGameChat(self.game.teamVoteStats() + " YES votes out of " + self.game.getNumUsers());
         
         // If everybody has voted, move on to the result analysis
         var result = self.game.getVoteResult();
         emit('team_vote_result', result, self.team_list);
         if (result) {
            sendGameChat('Mission: ' + self.team_list);
         } else {
            advanceVote();
         }
      }
   });
   
   // mission
   socket.on('mission', function(res) {
      // Submit the vote for the current mission
      if (self.game.mission(res)) {
         
         var numFails = self.game.missionVoteStats();
         var numAgents = self.game.getNumberOfAgents();
         sendGameChat(numFails + ' FAIL votes out of ' + numAgents);
         emit('AI_mission', numFails, numAgents);
         
         // Once everybody has voted, get results
         var result = self.game.missionResult();
         
         var winningTeam = self.game.getWinner();
         if (winningTeam !== -1) {
            victory(winningTeam);
            return;
         }
         
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
   
   if (self.num === self.numPlayers) {
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