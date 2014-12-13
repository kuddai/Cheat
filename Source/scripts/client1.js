/*
игра состоит из раундов. Каждый раунд заканчивается, когда кто-то из игроков 
забирает карты с главного стала и кучи
*/
function save(key, val) {
    localStorage.setItem(key, val);
}
function remove(key) {
    localStorage.removeItem(key);
}
function getVal(key) {
    return localStorage.getItem(key);
}


$(document).ready(function() {
	
	var socket = {};
    var myCards = [];
    var canCheckCards = [];
    var myNum = -1;
    var currPlayer = -1;
    var cardsOnBoard = [];
	
	var appereanceTime = 2000, updateTime = 700, deadTime = 1200, popTime = 400;
	var decks = new Array(4);
	var bottomDeck = new DeckDW('.player-bottom', 'horizontal', updateTime, deadTime, popTime);
	var topDeck = new DeckDW('.player-top', 'radial', updateTime, deadTime, popTime);
	var leftDeck = new DeckDW('.player-left', 'radial', updateTime, deadTime, popTime);
	var rightDeck = new DeckDW('.player-right', 'radial', updateTime, deadTime, popTime);
	var mainDeck = new DeckDW('.main-field', 'horizontal', updateTime, deadTime, popTime);
	var pileDeck = new DeckDW('.pile', 'vertical', updateTime, deadTime, popTime);

    $.event.swipe.delay = 5000;
    $.event.swipe.max = 220;
    $.event.swipe.min = 50;
    var swipe = false;

    var MAX_PLAYERS = 3;
    var ALL_CARDS = [
         { value: "6" }
        ,{ value: "7" }
        ,{ value: "8" }
        ,{ value: "9" }
        ,{ value: "10" }
        ,{ value: "J" }
        ,{ value: "Q" }
        ,{ value: "K" } ];
	
	function fillDecks(clientPlayerId){
		decks[clientPlayerId] = bottomDeck;
		decks[(clientPlayerId + 1) % 4] = leftDeck;
		decks[(clientPlayerId + 2) % 4] = topDeck;
		decks[(clientPlayerId + 3) % 4] = rightDeck;
        //console.log("myNum = " + myNum);
        //console.log("decks = " + (decks[0] === undefined) + " " + (decks[1] === undefined)  );
	}

    socket = io.connect('http://128.73.34.111:25002');
	//socket = io.connect('https://still-coast-5518.herokuapp.com/');
	// Как загрузилась страница, подключаемся к серверу.
    socket.once('connect', function() {

        socket.emit("ready", JSON.stringify({ "name": "defaultName", "id":getVal("id") }));
        // START GAME HERE
		// playerInfo - {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on('StartGame', function(playerInfo) {
            var parsed = JSON.parse(playerInfo);
            myCards = parsed.cards;
            myNum = parseInt(parsed.num);
            save("id", parsed.id);
            save("num", myNum);
			fillDecks(myNum);
            //ResetDecks();
            bottomDeck.removeAll();
			bottomDeck.addCards(parsed.cards, "open");
			bottomDeck.update(appereanceTime);
        });
        
        socket.on("changeID", function(id) {
            save("id", id);
        });
        // SERVER SENDS YOUR CARDS
		// obj - массив карт
        socket.on("SetCards", function(obj) {
            myCards = JSON.parse(obj);
            //bottomDeck.removeAll();
			bottomDeck.addCards(myCards, "open");
			bottomDeck.update();
            //console.log("Cards = "+ obj);
        });
        // SERVER SENDS common info about all players.
		// {"номер игрока": [массив его карт в виде пустышек],.., "карты в куче": [массив карт в куче], "карты на столе": [массив карт на столе]}
		//вызывается, когда игрок поверил, либо проверил карты, либо совершил первый ход в текущем раунде
        socket.on("SetCardsOnBoard", function(obj) {
            //карты других игроков
			var p = JSON.parse(obj);//dictionary
			for (var i = 0; i < MAX_PLAYERS; i++){
				if (i !== myNum && decks[i].getCardsData().length !== p[i].length){
                    decks[i].removeAll();
					decks[i].addCards(p[i], "shirt" + (1 + i).toString(), true);
                    decks[i].update();
				}
			}
			
			//подсветка текущего игроков
            if (currPlayer !== -1){
                decks[currPlayer].$field.removeClass("highlight");
            }
			currPlayer = p["currPlayer"];
            decks[currPlayer].$field.addClass("highlight");
            
            //карты на main-field
            canCheckCards = p["canCheckCards"] || [];
            cardsOnBoard = p["cardsOnBoard"] || [];
            mainDeck.removeAll();
            //текущий игрок
			if (currPlayer !== myNum){
                if (canCheckCards.length !== 0){
				    mainDeck.addCards(p["canCheckCards"], 
                        "shirt" + (p["canCheckCards"][0].owner + 1).toString(), true);
                    mainDeck.update();
                } else {
                    mainDeck.removeAll();
                    mainDeck.update();
                }
			} else {
			    //наш ход
                if (canCheckCards.length !== 0){
                    var shirt = p["canCheckCards"][0].owner === myNum ?
                        "open" : "shirt" + (p["canCheckCards"][0].owner + 1).toString();
				    mainDeck.addCards(p["canCheckCards"], shirt);
                    mainDeck.update();
                } else {
                    mainDeck.removeAll();
                    mainDeck.update();
                }
			}
            // cardsOnBoard
            pileDeck.removeAll();
            for (var i = 0; i < p["cardsOnBoard"].length; i++) {
                pileDeck.addCards([ p["cardsOnBoard"][i] ],
                    "shirt" + (p["cardsOnBoard"][i].owner + 1).toString(), true);
            }
            pileDeck.update();
        });
        // ERROR HANDLER
		// Сообщение приходит в виде строки
        socket.on("gameError", function(msg) {
            console.log(msg);
        });
		// Положить карту на стол. Card - конкретная карта 
        socket.on("setCard", function(card) {
            //console.log("setCardMsg");
			var p = JSON.parse(card);
            //console.log("CardsData = " + decks[p.owner].getCardsData());
            decks[p.owner].removeCard(0);
			decks[p.owner].update();
            //console.log("shift" + (1 + p.owner).toString());
			mainDeck.addCards([ p ], "shirt" + (1 + p.owner).toString(), true);
			mainDeck.update();
            console.log("Card got!");
        });
		// Убрать карту со стола. Номер карты в списке стола
        socket.on("removeCard", function(cardNum) {
            mainDeck.removeCard(parseInt(cardNum));
            mainDeck.update();
            decks[currPlayer].addCards([ { owner:currPlayer, value:"", suit:"" } ],
             "shirt" + (1 + currPlayer).toString(), true);
            decks[currPlayer].update();
        });
		// Навели на карту. Deck - данная колода, CardNum - номер карты в списке данной колоды
        socket.on("hoverUp", function(deck, cardNum) {
            if (deck === "mainDeck"){
                var $card = $(mainDeck.$cards.get(cardNum));
                mainDeck.popUp($card);
            } else {
                var $card = $(decks[deck].$cards.get(cardNum));
                decks[deck].popUp($card);
            }
        });
        socket.on("hoverDown", function(deck, cardNum) {
            if (deck === "mainDeck"){
                var $card = $(mainDeck.$cards.get(cardNum));
                mainDeck.popDown($card);
            } else {
                var $card = $(decks[deck].$cards.get(cardNum));
                decks[deck].popDown($card);
            }
        });
		// Присылается игрок looser
		// {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on("endGame", function(looser) {
            var p = JSON.parse(looser);
            console.log("Looser - " + p.name);
        });
		// Разные сообщения, которые нужно выводить в каком нибудь text field.
		// Сообщения типа: "Для старта игры нужно еще 2 игрока"
        socket.on("message", function(msg) {
            console.log("message: " + msg);
        });

    });

    var shouldNameCards = false;
    var sendCards = [];

    bottomDeck.$field.on("click", '.card[status="alive"]', function() {
        if(swipe) { return; }
        if (shouldNameCards) { return; }
        if (currPlayer !== myNum) { return; }
        var crd = DeckDW.extractData($(this));
        var card = { owner: myNum, value: crd.value, suit:crd.suit };
        socket.emit("setCard", JSON.stringify(card));
        bottomDeck.remove$Card($(this));
        bottomDeck.update();
        mainDeck.addCards([ card ], "open");
        mainDeck.update();
    });

  
    mainDeck.$field.on("click", '.card[status="alive"]', function() {
        if (swipe) { return; }
        if (!shouldNameCards){
            if (currPlayer === myNum) {
                var crd = DeckDW.extractData($(this));
                var card = { owner: myNum, value: crd.value, suit:crd.suit };
                if (canCheckCards.length === 0 || mainDeck.getCardsData().length !== canCheckCards.length){
                    // карта на которую нажали
                    if (DeckDW.extractData($(this)).suit === "") {
                        return;
                    }
                    socket.emit("removeCard", mainDeck.$cards.index(this));
                    mainDeck.remove$Card($(this));
                    mainDeck.update();
                    bottomDeck.addCards([ card ], "open");
                    bottomDeck.update();
                } else {
                    socket.emit("check", mainDeck.$cards.index(this));
                }
            }
        } else {
            var cardName = DeckDW.extractData($(this)).value;
            mainDeck.removeAll();
            mainDeck.update();
            socket.emit("firstTurn", JSON.stringify(sendCards), cardName);
            sendCards = [];
            shouldNameCards = false;
        }
    });

    //hover. Нужно записывать именно так с конкатенацией
    bottomDeck.$field.on("mouseenter", '.card[status="alive"]', function() {
        swipe = false;
        bottomDeck.popUp($(this));
        //if(currPlayer !== myNum) return;
        socket.emit("hoverUp", myNum, bottomDeck.$cards.index(this));
    }).on("mouseleave", '.card[status="alive"]', function() {
        bottomDeck.popDown($(this));
        //if(currPlayer !== myNum) return;
        socket.emit("hoverDown", myNum, bottomDeck.$cards.index(this));
    });

    mainDeck.$field.on("mouseenter", '.card[status="alive"]', function() {
        swipe = false;
        mainDeck.popUp($(this));
        if (currPlayer !== myNum) { return; }
        socket.emit("hoverUp", "mainDeck", mainDeck.$cards.index(this));
    }).on("mouseleave", '.card[status="alive"]', function() {
        mainDeck.popDown($(this));
        if (currPlayer !== myNum) { return; }
        socket.emit("hoverDown", "mainDeck", mainDeck.$cards.index(this));
    });

    // 
    
    
    mainDeck.$field.on("swipeup", '.card[status="alive"]', function() {
        //console.log("SWIPE!!!");
        var cardsData = mainDeck.getCardsData();
        if (shouldNameCards) { return; }
        //console.log("CardsDataLength = " + cardsData.length);
        if (cardsData.length !== 0) {
            if ((cardsOnBoard.length !== 0 || canCheckCards.length !== 0) &&
                cardsData[0].owner !== myNum && 
                cardsData.length > canCheckCards.length) {
                var crds = mainDeck.getCardsData();
                var send = []; 
                for (var i = 0; i < crds.length; i++) {
                    if (i >= canCheckCards.length){
                        send.push({ owner:myNum, value:crds[i].value, suit:crds[i].suit });
                    }
                };
                socket.emit("believe", JSON.stringify(send));
                //console.log("Believe send!");
            }
            if (canCheckCards.length === 0 && cardsOnBoard.length === 0) {
                sendCards = [];
                var crdData = mainDeck.getCardsData();
                for (var i = 0; i < crdData.length; i++) {
                    sendCards.push({ owner:myNum, value:crdData[i].value, suit:crdData[i].suit });
                };
                mainDeck.removeAll();
                mainDeck.update();
                mainDeck.addCards(ALL_CARDS, "open");
                mainDeck.update();
                shouldNameCards = true;
            }
        }
        
        swipe = true;
        //console.log("Swipe = " + swipe);
    });


    $(window).resize(function() {
        for (var i = 0; i < decks.length; i++) {
            if (decks[i] !== undefined){
                decks[i].update(); 
            }
        };
        mainDeck.update();
        pileDeck.update();
    });
});
