module.exports = {

   Game: function() {
      var userList = [];
      var roles = {};
      var spies = [];
      var isStarted = false;
      
      var roundNumber = 0;
      var numSpyWins = 0;
      var numResistanceWins = 0;
      
      var voteCount = 0;
      
      var vote = false;
      var voteYesCount = 0;
      var playersVoted = 0;
      
      var leader;
      
      var missionVoted = 0;
      var missionPassed = true;
      
      console.log('New game object instantiated');
   
      this.newGame = function() {
         isStarted = true;
         
         leader = 0;
         
         userList = shuffle(userList);
         
         var i = 0;
         switch(userList.length) {
         case 5:
         case 6:
            for (; i < 2; ++i) {
               spies[i] = userList[i];
               roles[userList[i]] = 'SPY';
            }
            for (; i < userList.length; ++i) {
               roles[userList[i]] = 'RESISTANCE';
            }
            break;
         case 7:
         case 8:
         case 9:
            for (; i < 3; ++i) {
               spies[i] = userList[i];
               roles[userList[i]] = 'SPY';
            }
            for (; i < userList.length; ++i) {
               roles[userList[i]] = 'RESISTANCE';
            }
            break;
         case 10:
            for (; i < 4; ++i) {
               spies[i] = userList[i];
               roles[userList[i]] = 'SPY';
            }
            for (; i < userList.length; ++i) {
               roles[userList[i]] = 'RESISTANCE';
            }
            break;

         default:
            for (; i < userList.length - 1; ++i) {
               roles[userList[i]] = 'SPY';
               spies[i] = userList[i];
            }
            for (; i < userList.length; ++i) {
               roles[userList[i]] = 'RESISTANCE';
            }
            break;
         }
         
         return roles;
      };
      
      this.nextRound = function() {
         roundNumber++;
         voteCount = 1;
         if (++leader === userList.length) {
            leader = 0;
         }
         
         return roundNumber > 5;
      };
      
      this.nextVote = function() {
         ++voteCount;
         if (++leader === userList.length) {
            leader = 0;
         }
         
         return voteCount > 5;
      };
      
      this.getNumberOfAgents = function() {
         switch (userList.length) {
            case 5:
               switch(roundNumber) {
                  case 1:
                  case 3:
                     return 2;
                  case 2:
                  case 4:
                  case 5:
                     return 3;
                  default:
                     break;
               }
               break;
               
            case 6:
               switch(roundNumber) {
                  case 1:
                     return 2;
                  case 2:
                  case 4:
                     return 3;
                  case 3:
                  case 5:
                     return 4;
                  default:
                     break;
               }
               break;
               
            case 7:
               switch(roundNumber) {
                  case 1:
                     return 2;
                  case 2:
                  case 3:
                     return 3;
                  case 4:
                  case 5:
                     return 4;
                  default:
                     break;
               }
               break;

            case 8:
            case 9:
            case 10:
               switch(roundNumber) {
                  case 1:
                     return 3;
                  case 2:
                  case 3:
                     return 4;
                  case 4:
                  case 5:
                     return 5;
                  default:
                     break;
               }
               
            default:
               break;

         }
         
         return 1;
      };
      
      
      this.correctNumberOnTeam = function(num) {
         return this.getNumberOfAgents() === num;
      };
      
      this.teamVote = function(choice) {
         voteYesCount += choice;
         
         if (++playersVoted === userList.length) {
            vote = (voteYesCount >= (userList.length / 2));
            return true;
         }
         
         return false;
      };
      
      this.getVoteResult = function() {
         var result = vote;
         vote = false;
         playersVoted = 0;
         voteYesCount = 0;
         
         return result;
      };
      
      this.mission = function(choice) {
         if (choice === 0) {
            missionPassed = false;
         }
         
         if (++missionVoted === this.getNumberOfAgents()) {
            return true;
         }
         
         return false;
      };
      
      this.missionResult = function() {
         missionVoted = 0;
         
         var res = missionPassed;
         missionPassed = true;
         return res;
      };
      
      
      this.addUser = function(name) {
         userList[userList.length] = name;
      };
      
      this.dropUser = function(name) {
         var index = userList.indexOf(name);
         userList.splice(index, 1);
      };
      
      this.getNumUsers = function() {
         return userList.length;
      };


      this.getUsers = function() {
         return userList;
      };
      
      this.getRoles = function() {
         return roles;
      };
      
      this.isGameStarted = function() {
         return isStarted;
      };
      
      this.getSpies = function() {
         return spies;
      };
      
      this.getRoundLeader = function() {
         return userList[leader];
      };
      
      this.getRoundNumber = function() {
         return roundNumber;
      };
      
      this.getVoteNumber = function() {
         return voteCount;
      };
      
      this.getWinner = function() {
         if (numSpyWins === 3)
            return 0;
         if (numResistanceWins === 3)
            return 1;
         
         return -1;
      };
      
      
      this.verifyState = function() {
         if (roundNumber > 5) {
            throw "Round Number too high: " + roundNumber;
         }
      };
      
   }
   
};

var shuffle = function(arr) {
   var currentIndex = arr.length, temporaryValue, randomIndex;
   
   while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      
      // And swap it
      temporaryValue = arr[currentIndex];
      arr[currentIndex] = arr[randomIndex];
      arr[randomIndex] = temporaryValue;
   }
   
   return arr;
};