function save(key, val) {
    sessionStorage.setItem(key, val);
}
function remove(key) {
    sessionStorage.removeItem(key);
}
function getVal(key) {
    return sessionStorage.getItem(key);
}

$(document).ready(function() {
	var socket = io.connect('http://127.0.0.1:25002');
    var MAX_PLAYERS = 4;
 
    socket.once('connect', function() {
        var clientPlayerId;
        var currentPlayerId;
        var decks;
        var input;
        var gameStart = true;
        socket.emit("ready", 
        	JSON.stringify({ "name": "defaultName", "id":getVal("id") })
        ); 
        console.log("wait for the game to start");
        /*var intervalID = setInterval( function () {
            console.log("emit ready");
        	socket.emit("ready", 
        		JSON.stringify({ "name": "defaultName", "id":getVal("id") })
        		); 
        }, 1000);*/
//-----------------------EVENTS-----------------------        
		// playerInfo - {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on('startGame', function(playerInfo) {
        	//clearInterval(intervalID);
            var parsed = JSON.parse(playerInfo);
            clientPlayerId = parseInt(parsed.num);
            save("id", parsed.id);
            save("num", clientPlayerId);

            decks = createDecks(clientPlayerId);
            input = new Input(socket, clientPlayerId, getShirt, decks);
            
            $(".go-button").click(function() {
                input.goClick();
            });
            
            decks("bottom").$field.on("click", '.card[status="alive"]', function() {
                input.bottomClick(this);
            });
            decks("bottom").$field.on("mouseenter", '.card[status="alive"]', function() {
                input.bottomEnter(this);
            });
            decks("bottom").$field.on("mouseleave", '.card[status="alive"]', function() {
                input.bottomLeave(this);
            });
            decks("main").$field.on("click", '.card[status="alive"]', function() {
                input.mainClick(this);
            });
            decks("main").$field.on("mouseenter", '.card[status="alive"]', function() {
                input.mainEnter(this);
            });
            decks("main").$field.on("mouseleave", '.card[status="alive"]', function() {
                input.mainLeave(this);
            });     
            
            $(window).resize(function() {
                var allDecks = decks("all");
                for (var i = 0; i < allDecks.length; i++) {
                    allDecks[i].update();
                };
            });            
            console.log("Game has started. Our client id: " + clientPlayerId);
        });
        
        socket.on("changeID", function(id) {
        	console.log("My id: " + id);
            save("id", id);
        });
        
        // SERVER SENDS common info about all players.
		// {"номер игрока": [массив его карт в виде пустышек],.., 
		//"карты в куче": [массив карт в куче], "карты на столе": [массив карт на столе]}
        socket.on("update", function(rawData) {
            //all cards in the game
			var data = JSON.parse(rawData);
			//console.log("clientPlayerId" + clientPlayerId);
			//console.log(rawData);
		    for (var playerid = 0; playerid < MAX_PLAYERS; playerid++) {
		        var shirt = (playerid === clientPlayerId) ? "open" : getShirt(playerid);
		        decks(playerid).set(data[playerid], shirt);
			}
			
			//подсветка текущего игроков
			switchHighlighting(currentPlayerId, data["currPlayer"], decks);
			
			currentPlayerId = data["currPlayer"];
			console.log(clientPlayerId + ": Current Player " + currentPlayerId);
			
            var checkedIndex = data["checkedIndex"];
            var mainCards = data["canCheckCards"] || [];
            var pileCards = data["pileCards"] || [];
            
            decks("pile").set(pileCards, getShirt);
            input.update(mainCards, pileCards.length > 0, currentPlayerId, checkedIndex);
            console.log(clientPlayerId + ": Current state " + input.getState());
        });
        
        // ERROR HANDLER
        socket.on("gameError", function(msg) {
            console.log(clientPlayerId + ": " + msg);
        });
        socket.on("setCard", function(deckKey, cardIndex, roundCardValue) {
            input.otherToMain(deckKey, cardIndex, roundCardValue);
        });
        socket.on("removeCard", function(deckKey, cardIndex) {
            input.otherFromMain(deckKey, cardIndex);
        });
		//handler signature: deckKey, cardIndex
        socket.on("hoverUp", function(deckKey, cardIndex) {
            input.otherEnter(deckKey, cardIndex);
        });
        //handler signature: deckKey, cardIndex
        socket.on("hoverDown", function(deckKey, cardIndex) { 
            input.otherLeave(deckKey, cardIndex);
        });
        
		// Присылается игрок looser
		// {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on("endGame", function(looser) {
             var p = JSON.parse(looser);
            input.clean();
            $(".go-button").text(p.name + " lost");
            var allDecks = decks("all");
            for (var i = 0; i < allDecks.length; i++) {
                allDecks.removeAll();
                allDecks.update();
            }
            console.log(clientPlayerId + ": " +"Looser - " + p.name);
        });
		// Разные сообщения, которые нужно выводить в каком нибудь text field.
		// Сообщения типа: "Для старта игры нужно еще 2 игрока"
        socket.on("message", function(msg) {
            console.log(clientPlayerId + ": " +"message: " + msg);
        });
        


    });
});
