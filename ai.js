module.exports = {
   AI: function(game) {
      
      var currGame = game;
      
      this.printRound = function() {
         console.log(currGame.getRoundNumber());
      }
      
   }
}