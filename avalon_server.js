var self = null;

var Avalon = function(room) {
   self = this;
   
   this.room = room;
};

Avalon.prototype.addAI = function(socket, ai_id) {
   
};

Avalon.prototype.closeAI = function() {
   
};

function applySocket(socket) {
   
};

function serverChat(msg) {
   self.room.sendChatClient('GAME-> ' + msg);
};

module.exports = Avalon;