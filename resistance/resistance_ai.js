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
   
   // If the person this represents is a known spy, shut off trust.
   this.knownSpy = function() {
      this.trust = 0;
   };
   
   this.updateLeaderTrust = function(didPass) {
      if (didPass) {
         
      } else {
         this.trust -= .1;
      }
   }
   
   this.choose = function() {
      if (autoTrust) {
         return true;
      }
      
      if (this.trust > .7)
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
   AI: function(id, game, room_id) {
      
      this.NAME = 'AI ' + id;
      
      // Passed in parameters
      this.id = id;
      this.game = game;
      
      /***********************************************************************/
      
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
      
      /***********************************************************************/
      
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
      this.lastCaptain = null;
      
      
      
      /** Here, the AI saves it's role and any teammates */
      this.socket.on('role', function(name, role, spies) {
         
         self.role = role;
         
         // Get the player list to assign trust levels
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
      
      /** ASS MODULE
         If this AI is the commander, update trust of spies to be 0 */
      this.socket.on('commander', function(spies) {
         
         spies.forEach(function(spy) {
            self.playerWeights[spy].knownSpy();
         });
         
      });
      
      this.socket.on('assassin_guess', function(resistance) {
         var num_choices = resistance.length;
         var res_choice = Math.floor(Math.random() * (num_choices - 1));
         
         this.emit('assassin_guess', resistance[res_choice]);
      });
      
      /** END OF ASS MODULE */
      
      
      /**
       * Choose people to go on a mission
       */
      this.socket.on('leader', function(userList, numberOfAgents) {
         var team_list = [];

         // Always add self to a mission
         var place = -1;
         userList.forEach(function(val, ndx) {
            if (val.name === self.NAME) {
               place = ndx;
            }
         });
         team_list[0] = userList[place].name;
         userList.splice(place, 1); // Removes self from the list
         
         // Now chooses (numberOfAgents - 1) from the rest of the options
         var q = 0;
         if (self.role === "SPY") { // Spy choices for mission
            while(team_list.length < numberOfAgents) {
               
               // This loop promises that only 1 spy will be put on a mission
               // when a spy is the captain (AKA just themselves)
               if (_.contains(self.teammates, userList[q].name)) {
                  q++;
                  continue;
               }
               
               team_list[team_list.length] = userList[q].name;
               q++;
            }
         } else { // Resistance choices
            
            // Array for all the players who seem too sketchy
            var undesirable = [];
            
            // Walk through the userList up to once filling up
            // the team_list with reasonable agents
            while (team_list.length < numberOfAgents && q < userList.length) {
               
               var curr = userList[q].name;
               if (self.playerWeights[curr].choose()) {
                  team_list[team_list.length] = curr;
               } else {
                  undesirable[undesirable.length] = curr;
               }
               
               q++;
            }
            
            // If the chosen list is too short (ie the computer doesn't trust
            // a lot of people), then just start filling
            q = 0;
            while (team_list.length < numberOfAgents) {
               team_list[team_list.length] = undesirable[q++];
            }
            
         }
         
         // Once done, emit the chosen agents
         self.socket.emit('team_list', team_list);
      });
      
      
      /**
       * Vote on whether the team seems legit
       */
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
            }
         }
       
		   if (self.role === "SPY") {
            if (game.getVoteNumber() === 4) {
               // If the vote counter is at 4, spies WIN if the vote fails.
               worthy = false;
            } else {
               var numSpies = numSpiesOnMission(team, self.teammates);
               
               if (game.getNumResistanceWins() === 2) {
                  if (numSpies === 0) {
                     worthy = false;
                  }
               }
               worthy = true;
            }
         }
         
         
         // Send the vote back as to whether the team is good to go
         var vote = worthy ? 1 : 0;
         self.socket.emit('vote', vote);
      });
      
      
      /**
       * If this AI is on a mission, choose the result
       */
      this.socket.on('team_vote_result', function(res, team) {
         
         // If the team wasn't voted on, don't even bother
         if (!res)
            return;
         
         // Save data to process later (to update trust levels)
         self.lastTeam = team;
         self.lastCaptain = game.getRoundLeader();
         
         // Determine if this AI is on the mission
         var isOnMission = false;
         team.forEach(function(val, ndx) {
            if (val === self.NAME) {
               isOnMission = true;
            }
         });
         
         // If this AI isn't on the mission, it's done
         if (!isOnMission)
            return;
         
         
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
            });//numTeammatesOnMission is never used
            
            if (game.getNumSpyWins() === 2) {
               // First, if the spies already have 2 wins then auto-fail
               worthy = false;
            } if (game.getNumResistanceWins() === 2) {
               // If the Resistance already has 2 wins then auto-fail
               worthy = false;
            } else {
               // Depending on the round number, different logic can apply
               switch(game.getRoundNumber()) {
                  case 1:
                     if (game.getNumberOfAgents() > 2) {
                        worthy = false;
                     }
                     break;
                  case 2: // Just something to give the games a little bit of randomness
                     var rand = Math.random();
                     if (rand > .2)
                        worthy = false;
                     break;
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
         
      });
      
      
      /**
       * Update the AI's trust levels (if Resistance)
       */
      this.socket.on('AI_mission', function(numNoVotes, numAgents) {
         if (self.role === 'SPY')
            return;
         
         
         if (self.lastCaptain !== self.NAME) {
            self.playerWeights[self.lastCaptain].updateLeaderTrust(numNoVotes > 0);
         }
         
         
         var wasOnMission = _.contains(self.lastTeam, self.NAME);
         
         self.lastTeam.forEach(function(name) {
            
            if (wasOnMission)
               self.playerWeights[name].updateTrust(numAgents - 1, numNoVotes);
            else
               self.playerWeights[name].updateTrust(numAgents, numNoVotes);
            
         });
         
         
      });
      
      
      
      
      this.terminate = function() {
         this.socket.disconnect();
      };
      
   }
};


/* Helper function to tell this AI how many spies are on a mission */
var numSpiesOnMission = function(_team_list, _spy_list) {
   var num = 0;
   
   _spy_list.forEach(function(spy_name) {
      _team_list.forEach(function(team_name) {
         if (spy_name === team_name)
            ++num;
      });
   });
   
   return num;
}