var _ = require('./underscore-min');

var PlayerWeight = function(name, autoTrust) {
   // The AI will evaluate each person on a scale from 0 to 1
   // Where 1 is 'Always put on mission' and
   // 0 is 'Never put on mission'
   // For now, we will accept everybody and only drop them if
   // they are on a mission that failed.
   this.trust = 1.0;
   
   // autoTrust is used for spies to always trust each other
   this.autoTrust = autoTrust;
   this.name = name;
   
   this.updateTrust = function(numPeopleOnMission, numNoVotes) {
      // Add logic to change the trust level depending on the mission result
      // and how many people were on the mission.
      // IE: 3 people on a mission and 1 no vote makes everybody 1/3 likely
      // and will drop their trust score by .33
      
      if (this.autoTrust) {
         // Do Nothing, this person is already trusted
         return;
      }
      
      if (numNoVotes === 0) {
         // Do Nothing, Inconclusive.
         return;
      }
      
      var percentage = numNoVotes / numPeopleOnMission;
      
      // Update the trust based on the mission result
      this.trust *= (1 - percentage);
      
   };
   
   this.choose = function() {
      if (autoTrust) {
         return true;
      }
      
      if (this.trust > .65)
         return true;
      else if (this.trust < .35)
         return false;
      else {
         var rand = Math.random();
         return rand > .5;
      }
   };
};


module.exports = {
   AI: function(id, game) {
      
      this.NAME = 'AI ' + id;
      
      // Passed in parameters
      this.id = id;
      this.game = game;
      
      /* This code deletes the existance of 'socket.io-client' from
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
      this.socket.emit('add_name', this.NAME);
      
      // A self variable is needed to help with scope
      // issues later on in the socket code
      var self = this;
      
      
      // Game logic member variables
      this.role = "";
      this.teammates = null;  // Only for spies
      
      // Object to hold each player and how much this AI trusts them
      // In the form of <playerName>:<PlayerWeight>
      this.playerWeights = {};
      
      this.lastTeam = [];
      
      this.roundNum = -1;
      this.voteNum = -1;
      
      
      this.socket.on('accepted_user', function() {
         // Expected
      });
      this.socket.on('new_user', function(name) {
         // The AI doesn't care about new users
      });
      this.socket.on('dropped_user', function(name) {
         // The AI doesn't care about dropped users
      });
      
      /* When the game starts, each AI must request its role */
      this.socket.on('game_started', function() {
         self.socket.emit('send_role', self.NAME);
      });
      /* Here, the AI saves it's role and any teammates */
      this.socket.on('role', function(role, spies) {
         self.role = role;
         
         var players = game.getUsers();
         
         
         if (role === 'SPY') {
            self.teammates = spies;
            
            // Set up weights for everybody
            players.forEach(function(val) {
               var isTeammate = _.contains(spies, val.name);
               var newPlayer = new PlayerWeight(val.name, isTeammate);
               self.playerWeights[val.name] = newPlayer;
            });
         } else { // Not a SPY
         
            // Set up weights for everybody
            players.forEach(function(val) {
               var newPlayer = new PlayerWeight(val.name, false);
               self.playerWeights[val.name] = newPlayer;
            })
         }
         
         
         
      });
      
      
      
      // The AI doesn't care about this function
      this.socket.on('curr_leader', function(name, roundNum, voteNum) {
         // Code to set self.roundNum or self.voteNum could go here...
      });
      
      /* When the AI is the leader, it must select <numberOfAgents> from
      <userList> to go on a mission.
      
      This is where the main team selection logic goes */
      this.socket.on('leader', function(userList, numberOfAgents) {
         players = game.getUsers();
         var team_list = [];

         var place = -1;
         players.forEach(function(val, ndx) {
            if (val.name === self.NAME) {
               place = ndx;
            }
         });
         
         team_list[0] = players[place].name;
         var q = 0;
         if(self.role === "SPY") {
            while(team_list.length != numberOfAgents) {
               if(q === place){q++}
               team_list[team_list.length] = players[q].name;
               q++;
            }
         } else {
            while(team_list.length != numberOfAgents) {
               if(q === place){q++}
               //need to add people to the "friends" list and choose them
               team_list[team_list.length] = players[q].name;
               q++;
            } 
         }
         
         
         self.socket.emit('team_list', team_list);
      });
      
      this.socket.on('vote_team', function(team) {
         
		   var isOnTeam = false;
         team.forEach(function(val, ndx) {
            if (val === self.NAME) {
               isOnTeam = true;
            }
         });
         
         var worthy = false;
         
         // Gets the weighting of the current leader
         var leaderWeight = self.playerWeights[game.getRoundLeader()];
		   
         
         if (self.role === "RESISTANCE") {
            if (game.getVoteNumber() === 4) {
               // The resistance must accept any team after 4 failed team votes
               worthy = true;
            } else {
               
               worthy = true;
               // For each person on the team, analyze the percentages
               team.forEach(function(name) {
                  worthy &= self.playerWeights[name].choose();
               });
               //worthy = leaderWeight.choose();
            }
         }
       
		   if(self.role === "SPY") {
            if (game.getVoteNumber() === 4) {
               // If the vote counter is at 4, spies win if the vote fails
               worthy = false;
            } else {
               // TODO Add something about if a known spy is on the team
               worthy = true;
            }
         }
         
         
         // Send the vote back as to whether the team is good to go
         var vote = worthy ? 1 : 0;
         self.socket.emit('vote', vote);
      });
      
      this.socket.on('team_vote_result', function(res, team) {
         // If this AI is on the team (ie team[i] is 'AI <id>')
         // then it may vote on the mission
         // Otherwise, nothing
         
         if (!res)
            return;
         
         self.lastTeam = team;
         
         // Determine if this AI is on the mission
         var isOnMission = false;
         team.forEach(function(val, ndx) {
            if (val === self.NAME) {
               isOnMission = true;
            }
         });
         
         // Then if the AI is on the mission...
         if (isOnMission) {
            var worthy = true; // Resistance must always vote yes
            
            // Only spies need to decide
            if (self.role === "SPY") {
               
               // First, count the number of teammates on this mission
               // This DOES count self
               var numTeammatesOnMission = 0;
               self.teammates.forEach(function(mate) {
                  team.forEach(function(mission) {
                     if (mate === mission)
                        numTeammatesOnMission++;
                  });
               });
               
               if (game.getNumSpyWins() === 2) {
                  // First, if the spies already have 2 wins
                  // then auto fail the mission
                  worthy = false;
               } if (game.getNumResistanceWins() === 2) {
                  // If the Resistance already has 2 wins
                  // Every mission must fail
                  worthy = false;
               } else {
                  // Depending on the round number, different logic can apply
                  switch(game.getRoundNumber()) {
                     case 1:
                        if (game.getNumberOfAgents() > 2) {
                           worthy = false;
                        }
                        break;
                     case 2:
                     case 3:
                     case 4:
                     case 5: // Always fail on Round 5
                        worthy = false;
                     default:
                        break;
                  }
               }
            }
            
            
            // Finally emit the mission result
            var vote = worthy ? 1 : 0;
            self.socket.emit('mission', vote);
         }
         
      });
      
      
      this.socket.on('AI_mission', function(numNoVotes, numAgents) {
         // The AI need to update the team's trust levels
         self.lastTeam.forEach(function(name) {
            self.playerWeights[name].updateTrust(numAgents, numNoVotes);
         });
      });
      
      
      
      
      this.terminate = function() {
         this.socket.disconnect();
      };
      
   }
};