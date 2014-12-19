/*
Термины:
    Раунд:
        Момент игры, начиная с первого хода нового раунда,
        до того пока кто-то из игроков не заберет все карты
        со стола и кучи (проиграет это раунд).
        
    Куча:
        Место, где складываются карты текущего раунда, которые
        достанутся проигравшему в этом раунде. Куча попалняется 
        картами со стола, каждый раз когда кто-то из игроков 
        говорит верю. Карты, единожды оказавшиеся в кучи, 
        остаются там до конца карты.
        
    Карта раунда:
        Значение карты, под которую маскируются все карты в 
        этом раунде. Не может быть тузом.
        
    Стол:
        Место куда докидываются карты, если игрок верит, и
        где также происходит проверка карты, если игрок не верит
        
    Текущий игрок:
        Игрок, который в данный момент может взаимодействовать с
        картами на столе. Только у текущего игрока, карты на столе 
        отображаются рубашками вниз (за исключением ситуаций, когда
        идет проверка карты на столе - тогда оно видна всем без исключения).
        
    Клиент:
        Игрок, у которого запускается данный код.
                
Состояния взаимодействия игрока с картами:
    Общее для всех состояний:
        Получаем popUp и popDown сообщения ото всех игроков и
        отслеживаем измениния в количестве их карт.
        
    Докладывание карт на стол (addingState):
        Если bundle не пуст (подсостояние "Верю") и отображаем карту на столе,
        переданную через bundle.
        По нажатию на карту из колоды текущего игрока, она убирается из колоды
        и добавлется на стол. 
        По нажатию на карту на главном столе, она убирается со стола и добавляется 
        обратно в колоду текущего игрока.
        Когда игрок выложил на стол все карты, которые он хотел (как минимум одну!),
        и если текущая карта раунда не выбрана (подсостояние "Первый ход раунда"), 
        то клиент переходит в состояние "выбор карты раунда", попутно передавая в нее все 
        выложенные на стол карты.
        Если же текущая карта раунда уже выбрана (подсостояние "Верю"), то клиент 
        отправляет выбранные карты на сервер (передается ход следующему игроку) и 
        переходит в состояние "Наблюдение".  
        
    Выбор карты раунда (choosingRoundCardState):
        На столе отображаются все возможные значения карт, кроме
        туза. По нажатию на карту на столе, она становится картой 
        раунда, а карты с состояния "Докладывание карт на стол" отправляются
        на сервер вместе со значением карты раунда.
        В этом состоянии нельзя докидывать на стол карты или 
        убирать их с него. Для всех остальных игроков на столе остаются
        карты из состояния "Докладывание карт на стол". 
        
    Можно проверить(checkingState):
        На столе находятся карты, выложенные на стол предыдущим игроком и
        замаскированные под текущую карту раунда. 
        По нажатию на любую из них происходит переход в состояние "Проверка" с
        передачей индекса нажатой карты в это состояние. 
        Если же игрок решает докинуть на стол карты из своей колоды,
        то по нажатию на карту из своей колоды он переходит в состояние 
        "Докладывание карт на стол" (подсостояние "Верю"), при том убирает 
        у себя нажатую карту и передает ее в состояние "Докладывание карт на стол". 
        
    Проверка (checkedState):
        Отсылка на сервер индекса и ждем от него ответа. Все описанное ниже
        определяется на основе ответа от сервера.
        Если поймали на лжи (текущий игрок является клиентом), то переходим в 
        состоние "Докладывание карт на стол" (подсостояние "Первый ход раунда") 
        и начинаем новый раунд. 
        Если нам говорили правду (текущий игрок не является клиентом),
        то переходим в состояние "Наблюдение".
    
    Наблюдение:
        Нет возможности взаимодействовать с главной доской.
        На главной доске отображаем карты рубашкой вверх, с отображением 
        значения текущей карты раунда, если она уже выбрана.
        
Общие замечания:
    Переход в состояние, завязанный на ожидание ответа от сервера, происходит
    в обработчике "SetCardsOnBoard", в зависимости от того является ли клиент
    текущим игроком.
*/



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
	
	var socket = {};
    var canCheckCards = [];
    var clientPlayerId = -1;
    var currPlayerId = -1;
    var pileCards = [];
	
	var appereanceTime = 2000, updateTime = 700, deadTime = 1200, popTime = 400;
	var playerDecks = new Array(4);
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

    var MAX_PLAYERS = 4;
    var ALL_CARDS = [
         { value: "6" }
        ,{ value: "7" }
        ,{ value: "8" }
        ,{ value: "9" }
        ,{ value: "10" }
        ,{ value: "J" }
        ,{ value: "Q" }
        ,{ value: "K" } ];
    console.log("Hello dino!");
    socket = io.connect('http://31.23.52.23:25002');

	
//-----------------------COMMON FUNCTIONS-----------------------

	function fillPlayersDecks(clientPlayerId){
		playerDecks[clientPlayerId] = bottomDeck;
		playerDecks[(clientPlayerId + 1) % 4] = leftDeck;
		playerDecks[(clientPlayerId + 2) % 4] = topDeck;
		playerDecks[(clientPlayerId + 3) % 4] = rightDeck;
        //console.log(clientPlayerId + ": " +"myNum = " + myNum);
        //console.log(clientPlayerId + ": " +"decks = " + (decks[0] === undefined) + " " + (decks[1] === undefined)  );
	}
	//socket = io.connect('https://still-coast-5518.herokuapp.com/');
	// Как загрузилась страница, подключаемся к серверу.
	function enableHoverOnMainDeck() {
	    console.log(clientPlayerId + ": " +"Hover on main desk is enabled");
        mainDeck.$field.on("mouseenter", '.card[status="alive"]', function() {
            swipe = false;
            mainDeck.popUp($(this));
            //if(currPlayer !== myNum) return;
            socket.emit("hoverUp", "mainDeck", mainDeck.$cards.index(this));
        }).on("mouseleave", '.card[status="alive"]', function() {
            mainDeck.popDown($(this));
            //if(currPlayer !== myNum) return;
            socket.emit("hoverDown", "mainDeck", mainDeck.$cards.index(this));
        });        
	}
	
	function enableHoverOnBottomDeck() {
	    console.log(clientPlayerId + ": " +"Hover on bottom desk is enabled");
        bottomDeck.$field.on("mouseenter", '.card[status="alive"]', function() {
            swipe = false;
            bottomDeck.popUp($(this));
            //if(currPlayer !== myNum) return;
            socket.emit("hoverUp", clientPlayerId, bottomDeck.$cards.index(this));
        }).on("mouseleave", '.card[status="alive"]', function() {
            bottomDeck.popDown($(this));
            //if(currPlayer !== myNum) return;
            socket.emit("hoverDown", clientPlayerId, bottomDeck.$cards.index(this));
        });	    
	}
	
	function removeInputHandlers() {
	    console.log(clientPlayerId + ": " +"Removed all handlers from main deck, and click handler from bottomDeck");
	    swipe = false;
	    bottomDeck.$field.off("click", '.card[status="alive"]');
	    mainDeck.$field.off("click", '.card[status="alive"]');
	    mainDeck.$field.off("swipeup", '.card[status="alive"]');
	    mainDeck.$field.off("mouseenter", '.card[status="alive"]');
	    mainDeck.$field.off("mouseleave", '.card[status="alive"]');
	    mainDeck.$field.off("click", '.open.card[status="alive"]');
	    mainDeck.$field.off("swipeup", '.open.card[status="alive"]');
	}
	
	function endStateAndClearMain() {
	    console.log(clientPlayerId + ": " +"Clear all input handlers except hover handler for bottom deck.");
	    console.log(clientPlayerId + ": " +"Clear all cards from main deck");
	    removeInputHandlers();
	    mainDeck.removeAll();
	    mainDeck.update();
	}
	
	function getShirt(playerID) {
        var shirtNumber = playerID + 1;//have to add one due to array numeration
        return "shirt" +  shirtNumber;
    }	
    
    function transfer(fromDeck, toDeck, info, shirt, duplicate) {
        fromDeck.removeCard(info.index);
        fromDeck.update();
        toDeck.addCards( [ info.card ], shirt);
        toDeck.update();
    }
	
//-----------------------STATES-----------------------
	
	function addingState($beliveCard, checkingCards) {
	    //function declarations
	    function getInfo(deck, $card) {
	        var info = {
	          card: DeckDW.extractData($card),
	          index: deck.$cards.index($card)
	        };
	        info.card.owner = clientPlayerId;
	        return info;
	    }
	    
	    function transferToMainDeck($card) {
	        var info = getInfo(bottomDeck, $card);
	        transfer(bottomDeck, mainDeck, info, "open");
	        socket.emit("setCard", JSON.stringify(info.card));
	    }
	    
	    function addOwner(cards, ownerId) {
	        for (var i = 0; i < cards.length; i++) {
	            cards[i].owner = ownerId;
	        }
	    }
	    
	    checkingCards = checkingCards || [];
	    //body
	    if ($beliveCard) {
	        console.log(clientPlayerId + ": " +"Starting: believe state");
	        transferToMainDeck($beliveCard);
	    } else {
	        console.log(clientPlayerId + ": " +"Starting: first turn state");
	        endStateAndClearMain();
	    }
	    
	    enableHoverOnMainDeck();
	    //input handlers
	    console.log(clientPlayerId + ": " +"Enable click on bottom deck");
	    bottomDeck.$field.on("click", '.card[status="alive"]', function() {
	        var info = getInfo(bottomDeck, $(this));
	        console.log(clientPlayerId + ": " + "clicked on card " + JSON.stringify(info));
	        transfer(bottomDeck, mainDeck, info, "open");
	        socket.emit("setCard", JSON.stringify(info.card));
	    });
	    console.log(clientPlayerId + ": " +"Enable click on main deck");
	    mainDeck.$field.on("click", '.open.card[status="alive"]', function() {
	        var info = getInfo(mainDeck, $(this));
	        /*if (info.index < checkingCards.length) {
	            console.log(clientPlayerId + ": " +"Can not click on card " + info.index + ". It is not our");
	            return;
	        }*/
	        transfer(mainDeck, bottomDeck, info, "open");
	        socket.emit("removeCard", info.index);
	    });
	    console.log(clientPlayerId + ": " +"Enable swipeup on main deck");
	    mainDeck.$field.on("swipeup", '.open.card[status="alive"]', function() {
	        var allCards = mainDeck.getCardsData();
	        var chosenCards = [];
	        for (var i = checkingCards.length; i < allCards.length; i++) {
	            var card = allCards[i];
	            chosenCards.push(card);
	        }
	        addOwner(chosenCards, clientPlayerId);
	        console.log(clientPlayerId + ": " +"Ending: addingState. Chosen cards: " + JSON.stringify(chosenCards));
	        if ($beliveCard) {
	            endStateAndClearMain();
	            
	            socket.emit("believe", JSON.stringify(chosenCards));
	        } else {
	            endStateAndClearMain();
	            choosingRoundCardState(chosenCards);
	        }
	    });
	}
	
	function choosingRoundCardState(chosenCards) {
	    //body
	    endStateAndClearMain();
	    console.log(clientPlayerId + ": " +"Starting: choosingRoundCardState. Chosen cards: " + JSON.stringify(chosenCards));
	    mainDeck.addCards(ALL_CARDS, "open");
	    mainDeck.update();
	    enableHoverOnMainDeck();
	    //handlers
	    console.log(clientPlayerId + ": " +"Enable click on main deck");
	    mainDeck.$field.on("click", '.card[status="alive"]', function() {
	        var roundCardValue = DeckDW.extractData($(this)).value;
	        console.log(clientPlayerId + ": " +"Ending: choosingRoundCardState. " + 
	                    "Chosen cards: " + JSON.stringify(chosenCards) + ". " +
	                    "Round card: " + roundCardValue);
	        endStateAndClearMain();
	        socket.emit("firstTurn", JSON.stringify(chosenCards), roundCardValue);
	    });
	}
	
	function checkingState(checkingCards) {
	    //body
	    endStateAndClearMain();
	    console.log(clientPlayerId + ": " +"Starting: checkingState. Checking cards count: " + checkingCards.length);
	    var previousPlayerId = checkingCards[0].owner;
	    mainDeck.addCards(checkingCards, getShirt(previousPlayerId));
	    mainDeck.update();
	    enableHoverOnMainDeck();
	    //handlers
	    console.log(clientPlayerId + ": " +"Enable click on main deck");
	    mainDeck.$field.on("click", '.card[status="alive"]', function() {
	        var checkedCardIndex = mainDeck.$cards.index(this);
	        console.log(clientPlayerId + ": " +"Ending: checkingState. Checked card index: " + checkedCardIndex);
	        endStateAndClearMain();
	        socket.emit("check", checkedCardIndex);
	    });
	    console.log(clientPlayerId + ": " +"Enable click on bottom deck");
	    bottomDeck.$field.on("click", '.card[status="alive"]', function() {
	        console.log(clientPlayerId + ": " +"Ending: checkingState. Chose believe");
	        removeInputHandlers();
	        addingState($(this), checkingCards);
	    });	 
	}
	
	function watchingState(mainDeckCards) {
	    endStateAndClearMain();
	    if(mainDeckCards.length > 0) {
	        var owner = mainDeckCards[0].owner;
	        console.log(clientPlayerId + ": " +"Watching state. Displaying cards of player: " + owner + 
	        ". Number of cards: " + mainDeckCards.length);
	        mainDeck.addCards(mainDeckCards, getShirt(owner));
	        mainDeck.update();
	    } else {
	        console.log(clientPlayerId + ": " +"Watching state. Nothing to display on main deck");
	    }
	    
	}

//-----------------------SOCKETS EVENTS-----------------------

    socket.once('connect', function() {
//-----------------------HELP FUNCTIONS-----------------------
		console.log(clientPlayerId + ": " +"i am inside socket once!");
        function renewClientPlayerDeck(rawData) {
            
            //bottomDeck.removeAll();
            var clientCards = JSON.parse(rawData);
            console.log(clientPlayerId + ": " +"Renew deck of the client player");
            console.log(clientPlayerId + ": " +"Cards on the bottom deck: " + JSON.stringify(rawData));
    		bottomDeck.addCards(clientCards, "open");
    		bottomDeck.update();
        }
        
        function renewOtherPlayersDecks(data) {
            console.log(clientPlayerId + ": " +"Renew decks of other players");
			for (var playerId = 0; playerId < MAX_PLAYERS; playerId++) {
			    var playerDeck = playerDecks[playerId];
			    var oldCards = playerDeck.getCardsData();
			    var newCards = data[playerId];
			    
			    var isClientPlayer = playerId === clientPlayerId;
			    var isNumberSame = oldCards.length == newCards.length;
			    
			    if (!isClientPlayer && !isNumberSame) { 
                    playerDeck.removeAll();
    				playerDeck.addCards(newCards, getShirt(playerId));
                    playerDeck.update();
			    }
			}        
        }
        
        function renewPileDeck(pileCards) {
            console.log(clientPlayerId + ": " +"Renew pile deck.");
            pileDeck.removeAll();
            for (var i = 0; i < pileCards.length; i++) {
                var pileCard = pileCards[i];
                pileDeck.addCards([ pileCard ], getShirt(pileCard.owner));
            }
            pileDeck.update();  
            console.log(clientPlayerId + ": Number of cards in pile deck: " + pileCards.length);
        }
        
        function startGame(playerInfo) {
        	clearInterval(intervalID);
            var parsed = JSON.parse(playerInfo);
            clientPlayerId = parseInt(parsed.num);
            console.log(clientPlayerId + ": " +"Our client id: " + clientPlayerId);
            save("id", parsed.id);
            save("num", clientPlayerId);
    		fillPlayersDecks(clientPlayerId);
            //ResetDecks();
            bottomDeck.removeAll();
    		bottomDeck.addCards(parsed.cards, "open");
    		bottomDeck.update(appereanceTime);
    		enableHoverOnBottomDeck();
    		//rus
    		endStateAndClearMain();
        }
        
        function transferToMainFromOthers(rawPlayerCard) {
			var playerCard = JSON.parse(rawPlayerCard);
			var playerId = playerCard.owner;
			var playerDeck = playerDecks[playerId];
            var info = { index: 0, card: playerCard };
            
            console.log(clientPlayerId + ": " +"Player" + playerId + " put card on the main field");
            
            transfer(playerDeck, mainDeck, info, getShirt(playerId), true);
        }
        
        function transferToOthersFromMain(cardIndex) {
            var currDeck = playerDecks[currPlayerId];
            var currCard = { owner:currPlayerId, value:"", suit:"" };
            var info = { index: cardIndex, card: currCard };
            
            console.log(clientPlayerId + ": " +"Player" + currPlayerId + " put card to his deck");
            
            transfer(mainDeck, currDeck, info, getShirt(currPlayerId), true);
        }
        
        function disableHighLighting(playerId) {
            if (playerId !== -1){
                playerDecks[playerId].$field.removeClass("highlight");
            }        
        }
        
        function enableHighLighting(playerId) {
            if (playerId !== -1){
                playerDecks[playerId].$field.addClass("highlight");
            }  
        }
        
        function popCard(deckKey, cardIndex, up){
            var deck = (deckKey === "mainDeck") ? mainDeck : playerDecks[deckKey];
            var $card = $(deck.$cards.get(cardIndex));
            
            if (up) {
                deck.popUp($card);
            } else {
                deck.popDown($card);
            }
        }
        
//-----------------------EVENTS-----------------------
        console.log(clientPlayerId + ": " +"emiting " + JSON.stringify({ "name": "defaultName", "id":getVal("id") }));
        var intervalID = setInterval( function () {
        	socket.emit("ready", 
        		JSON.stringify({ "name": "defaultName", "id":getVal("id") })
        		); 
        }, 1000);
        // START GAME HERE
		// playerInfo - {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on('StartGame', startGame);
        
        socket.on("changeID", function(id) {
        	console.log("My id: " + id);
            save("id", id);
        });
        // SERVER SENDS YOUR CARDS
		// obj - массив карт
        socket.on("SetCards", renewClientPlayerDeck);
        // SERVER SENDS common info about all players.
		// {"номер игрока": [массив его карт в виде пустышек],.., "карты в куче": [массив карт в куче], "карты на столе": [массив карт на столе]}
		//вызывается, когда игрок поверил, либо проверил карты, либо совершил первый ход в текущем раунде
        socket.on("SetCardsOnBoard", function(rawData) {
            //карты других игроков
			var data = JSON.parse(rawData);//dictionary
			renewOtherPlayersDecks(data);
			
			//подсветка текущего игроков
			var previousPlayerId = currPlayerId;
			currPlayerId = data["currPlayer"];
			
			console.log(clientPlayerId + ": " +"Previous player: " + previousPlayerId + 
			           ". Current Player: " + currPlayerId);
			           
			disableHighLighting(previousPlayerId);
            enableHighLighting(currPlayerId);
            
            //карты на main-field
            canCheckCards = data["canCheckCards"] || [];
            pileCards = data["cardsOnBoard"] || [];
            
            renewPileDeck(pileCards);
            
            if (currPlayerId !== clientPlayerId) {
                console.log(clientPlayerId + ": " +"Starting watching state. Not our turn.");
                watchingState(canCheckCards);
                return;
            }
            
            console.log(clientPlayerId + ": " +"Our turn!");
            
            var hasCardsToCheck = canCheckCards.length > 0;
            var hasPileCards = canCheckCards.length > 0;
            
            var firstTurn = !hasPileCards && !hasCardsToCheck;
            var checking = hasCardsToCheck;
            
            if (firstTurn) {
                addingState();
            } else if (checking) {
                 console.log(clientPlayerId + ": " +"We must check");
                checkingState(canCheckCards);
            } else {
                console.log(clientPlayerId + ": " +"Error! It is our turn, but there is no suitable state.");
                console.log(clientPlayerId + ": " +"Has cards to check: " + hasCardsToCheck + 
                          ". Has pile cards: " + hasPileCards);
            }
            
        });//end of "SetCardsOnBoard" handler
        // ERROR HANDLER
		// Сообщение приходит в виде строки
        socket.on("gameError", function(msg) {
            console.log(clientPlayerId + ": " + msg);
        });
		// Положить карту на стол. Card - конкретная карта 
        socket.on("setCard", transferToMainFromOthers);
		// Убрать карту со стола. Номер карты в списке стола
        socket.on("removeCard", transferToOthersFromMain);
		// Навели на карту. Deck - данная колода, CardNum - номер карты в списке данной колоды
        socket.on("hoverUp", function(deckKey, cardIndex) {
            popCard(deckKey, cardIndex, true);
        });
        socket.on("hoverDown", function(deck, cardNum) {
            popCard(deck, cardNum, false);
        });
		// Присылается игрок looser
		// {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on("endGame", function(looser) {
            removeInputHandlers();
            var p = JSON.parse(looser);
            console.log(clientPlayerId + ": " +"Looser - " + p.name);
        });
		// Разные сообщения, которые нужно выводить в каком нибудь text field.
		// Сообщения типа: "Для старта игры нужно еще 2 игрока"
        socket.on("message", function(msg) {
            console.log(clientPlayerId + ": " +"message: " + msg);
        });

    });


    $(window).resize(function() {
        for (var i = 0; i < playerDecks.length; i++) {
            if (playerDecks[i] !== undefined){
                playerDecks[i].update(); 
            }
        };
        mainDeck.update();
        pileDeck.update();
    });
});
