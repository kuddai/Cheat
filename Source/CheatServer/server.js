

var MAX_ROOMS = 1;
var MAX_PLAYERS = 4;
//var MAX_TURN_TIME = 120;
console.log("HI am server!");
//var io = require('socket.io').listen(process.env.PORT);
var io = require('socket.io').listen(25002);
var gcClass = require("./gameController.js").gc;
var Card = require("./gameController.js").card;
//var gc = new gcClass();

function Player(name, id, num){
	this.name = name;
	this.id = id;
	this.num = num;
	this.win = false;
	this.cards = [];
};


var rooms = [];
function StartServer() {

	function GameRoom(roomName) {
		this.clients = {};
		this.name = roomName;
		this.gc = new gcClass();
		this.notYourTurnError = function(socket) {
			if(this.gc.Players[this.gc.currPlayer].id !== socket.id) {
				socket.emit("gameError", "Not your turn!");
				return true;
			}
			return false;
		};

		this.setCard = function(socket, card) {
			//console.log("Set card msg");
			if(this.notYourTurnError(socket)) return;
			socket.broadcast.to(this.name).emit("setCard", 
				JSON.stringify(new Card(card.owner, this.gc.currCard, "")));
			//console.log("Card send!");
		};
		this.removeCard = function(socket, cardNum) {
			if(this.notYourTurnError(socket)) return;
			socket.broadcast.to(this.name).emit('removeCard', cardNum);
		};
		this.hover = function(socket, deck, cardNum, val) {
			//if(this.notYourTurnError(socket)) return;
			socket.broadcast.to(this.name).emit("hover" + val, deck, cardNum);
		};
		this.restart = function() {
			this.clients = {};
			this.gc = new gcClass(); 
			console.log("Restarted!");
		};
		// time to make turn
		/*var turnTime = MAX_TURN_TIME;
		this.timer = setInterval(function() {

		}, 1000);*/
		this.NextPlayer = function() {
			this.gc.currPlayer = this.gc.Next();
			var pl = this.gc.Players[this.gc.currPlayer];
			while(pl.cards.length === 0){
				pl.win = true;
				//console.log("PlayerWin = " + this.gc.Players[this.gc.currPlayer].win);
				this.gc.currPlayer = this.gc.Next();
				pl = this.gc.Players[this.gc.currPlayer];
			}
		};
		this.believe = function(socket,cards) {
			if(this.notYourTurnError(socket)) return;
			if(this.gc.canCheckCards.length === 0) {
				socket.emit("gameError", "There is no cards you can agree with!");
				return;
			}
			var res = this.gc.Believe(JSON.parse(cards));
			if(res !== "ok"){
				socket.emit("gameError", res);
				return;
			}
			socket.emit("SetCards", JSON.stringify(this.gc.Players[this.gc.currPlayer].cards));
			//this.gc.currPlayer = this.gc.Next();
			this.NextPlayer();
			SendCommonInfoToAll(this);
		};
		this.check = function(socket,cardNum) {
			if(this.notYourTurnError(socket)) return;
			if(this.gc.canCheckCards.length === 0) {
				socket.emit("gameError", "There is no cards you can agree with!");
				return;
			}
			if(cardNum >= this.gc.canCheckCards.length) {
				socket.emit("gameError", "There is no card with such number" + cardNum + "!");
				return;
			}
			var winPl = this.gc.Check(cardNum);
			if(winPl === undefined) return;
			this.clients[winPl.id].emit("SetCards", JSON.stringify(winPl.cards));
			if(winPl.id === this.gc.Players[this.gc.currPlayer].id) {
				//this.gc.currPlayer = this.gc.Next();
				this.NextPlayer();
			}
			this.gc.currCard = "";
			SendCommonInfoToAll(this);
			if(this.gc.checkEnd()){
				io.sockets.in(this.name).emit('endGame', JSON.stringify(this.gc.looser));
				//this.clients = {};
				//this.gc = new gcClass();
				this.restart(); 				
			}
		};
		this.firstTurn = function(socket,cards, cardName) {
			//console.log("roomName = " + this.name);
			if(this.notYourTurnError(socket)) return;
			if(this.gc.canCheckCards.length !== 0) {
				socket.emit("gameError", "Cant make first turn, cause there are some cards on the table!");
				return;
			}
			if(this.gc.cardsOnBoard.length !== 0) {
				socket.emit("gameError", "Cant make first turn, cause there are some cards on the table!");
				return;
			}
			var res = this.gc.FirstTurn(JSON.parse(cards), cardName);
			if(res !== "ok"){
				socket.emit("gameError", res);
				return;
			}
			socket.emit("SetCards", JSON.stringify(this.gc.Players[this.gc.currPlayer].cards));
			//this.gc.currPlayer = this.gc.Next();
			this.NextPlayer();
			SendCommonInfoToAll(this);
		};
	};
	function GetEmptyCards(cards, cardName) {
		var res = [];
		for(var i = 0; i < cards.length; i++){
			res.push(new Card(cards[i].owner, cardName || "", ""));
		}
		return res;
	}
	function SendCommonInfoToAll(room) {
		var info = {};
		info["cardsOnBoard"] = GetEmptyCards(room.gc.cardsOnBoard);
		info["canCheckCards"] = GetEmptyCards(room.gc.canCheckCards, room.gc.currCard);
		info["currPlayer"] = room.gc.currPlayer;
		//console.log("Sended curr player = " + room.gc.currPlayer);
		for(var i = 0; i < room.gc.Players.length; i++){     
			info[room.gc.Players[i].num] = GetEmptyCards(room.gc.Players[i].cards);
		}
		io.to(room.name).emit("SetCardsOnBoard", JSON.stringify(info));
	};
	function SendCommonInfoTo(socket, room) {
		var info = {};
		info["cardsOnBoard"] = GetEmptyCards(room.gc.cardsOnBoard);
		info["canCheckCards"] = GetEmptyCards(room.gc.canCheckCards, room.gc.currCard);
		info["currPlayer"] = room.gc.currPlayer;
		for(var i = 0; i < room.gc.Players.length; i++){     
			info[room.gc.Players[i].num] = GetEmptyCards(room.gc.Players[i].cards);
		}
		socket.emit("SetCardsOnBoard", JSON.stringify(info));
	};
	function FindRoom() {
		if(rooms.length === 0){
			rooms.push(new GameRoom("test"+rooms.length));
			return rooms[rooms.length-1];
		}
		else{
			for (var i = 0; i < rooms.length; i++) {
				if(!rooms[i].gc.inGame){
					return rooms[i];
				}
			};
		}
		if(rooms.length < MAX_ROOMS){
			rooms.push(new GameRoom("test"+rooms.length));
			return rooms[rooms.length-1];
		}
		return undefined;
	};
	
	function GetRoom(socket) {
		for (var i = 0; i < rooms.length; i++) {
			if(socket.room === rooms[i].name){
				return rooms[i];
			}
		}
		return undefined;
	};

	function ReconnectPlayer(socket, id) {
		for(var i = 0; i < rooms.length; i++){
			var currClient = rooms[i].clients[id];
			if(currClient !== undefined){
				delete rooms[i].clients[id];
				rooms[i].clients[socket.id] = socket;
				rooms[i].gc.GetPlayer(id).id = socket.id;
				socket.room = rooms[i].name;
				socket.join(rooms[i].name);
				return rooms[i];
			}	
		}
		return undefined;
	}
	function HasPlayer(socket) {
		for(var i = 0; i < rooms.length; i++){
			var currClient = rooms[i].clients[socket.id];
			if(currClient !== undefined){
				return true;
			}	
		}
		return false;
	}
	function IsInRoom(socket) {
		var client = undefined;
		for(var i = 0; i < rooms.length; i++){
			client = rooms[i].clients[socket.id];
			if(client !== undefined) {
				return true;
			}
		}
		console.log("Not in room!");
		return false;
	}
	/*function RestartGameRoom(room) {
		io.sockets.in(room.name).emit('message', "Game closed by server. Room timeout.");
		room.clients = {};
		room.gc = new gcClass(); 
	}*/
	function CheckReconnection(socket, id) {
		var rcPRoom = ReconnectPlayer(socket, id); 
		if(rcPRoom !== undefined){
			if(rcPRoom.gc.Players.length === MAX_PLAYERS) {
				socket.emit("StartGame", JSON.stringify(rcPRoom.gc.GetPlayer(socket.id)));
				SendCommonInfoTo(socket, rcPRoom);
				return "reconnected";
			} else {
				socket.emit("changeID", socket.id);
				return "reconnected";
			}
		}
		return "new player";
	}
	io.sockets.on('connection', function (socket) {
		console.log("Someone connected...");
		socket.on("ready", function(obj) {
			if(HasPlayer(socket)) {
				socket.emit("gameError", "You've already connected to server room!");
				return;
			}
			var pres = JSON.parse(obj);
			var plName = pres.name;
			var id = pres.id;
			if(CheckReconnection(socket, id) === "reconnected") { return; }
			var myRoom = FindRoom();
			//console.log("myRoom = " + myRoom.name);
			if(myRoom === undefined) return;
			socket.room = myRoom.name;
			socket.join(myRoom.name);
			//console.log("socketRoomsAfter = " + socket.rooms);
			myRoom.clients[socket.id] = socket;
			myRoom.gc.AddPlayer(new Player(plName, socket.id, myRoom.gc.Players.length));
			console.log("Player connected. ID = " + socket.id);
			if(myRoom.gc.Players.length === MAX_PLAYERS) {
				console.log("Game started.");
				myRoom.gc.inGame = true;
				myRoom.gc.StartGame();
				for (var key in myRoom.clients) {
	  				if (myRoom.clients.hasOwnProperty(key)) {
	    				myRoom.clients[key].emit("StartGame", 
	    					JSON.stringify(myRoom.gc.GetPlayer(myRoom.clients[key].id)));
	    			}
	  			}
	  			SendCommonInfoToAll(myRoom);
			}
			else{
				socket.emit("changeID", socket.id);
				var n = MAX_PLAYERS -myRoom.gc.Players.length;
				socket.emit("message", "Need " +
				 (n === 1 ? "1 player" : n + " players") + " to start");
				console.log(
					"Room " + myRoom.name + " needs " + 
					(n === 1 ? "1 player" : n + " players") + " to start"
				);
			}
		});

		socket.on("believe", function(cards) {
			if(!IsInRoom(socket)) return;
			GetRoom(socket).believe(socket,cards);
		});
		socket.on("check", function(cardNum) {
			if(!IsInRoom(socket)) return;
			GetRoom(socket).check(socket,cardNum);
		});
		socket.on("firstTurn", function(cards, cardName) {
			if(!IsInRoom(socket)) return;
			GetRoom(socket).firstTurn(socket,cards, cardName);
		});
		socket.on("setCard", function(card){
			if(!IsInRoom(socket)) return;
			GetRoom(socket).setCard(socket, JSON.parse(card));
		});
		socket.on("removeCard", function(cardNum){
			if(!IsInRoom(socket)) return;
			GetRoom(socket).removeCard(socket, cardNum);
		});
		socket.on("hoverUp", function(deck, cardNum){
			if(!IsInRoom(socket)) return;
			GetRoom(socket).hover(socket, deck, cardNum, "Up");
		});
		socket.on("hoverDown", function(deck, cardNum){
			if(!IsInRoom(socket)) return;
			GetRoom(socket).hover(socket, deck, cardNum, "Down");
		});

		// FOR TESTS
		socket.on("restart", function() {
			//if(!IsInRoom(socket)) return;
			//GetRoom(socket).restart();
			for (var i = 0; i < rooms.length; i++) {
				rooms[i].restart();
			};
			console.log("Rooms restarted!");
			socket.emit("restarted");
		});
		socket.on("message", function(msg) {
			console.log(msg);
		});

	    socket.on('disconnect', function () {
	  	});
	});
};

StartServer();