function Input(io, clientId, ownerToShirt, deckByKey) {
    var REVEAL_DELAY = 2000;    
    var ALL_ROUND_CARDS = [
         { value: "6" }
        ,{ value: "7" }
        ,{ value: "8" }
        ,{ value: "9" }
        ,{ value: "10" }
        ,{ value: "J" }
        ,{ value: "Q" }
        ,{ value: "K" } 
    ];
    
    var self = this;
    var $goButton = $(".go-button");
    var clientShirt = ownerToShirt(clientId);
    var main = deckByKey("main");
    var bottom = deckByKey(clientId);
    
    function disableGoButton() {
        $goButton.removeClass("yellow");
        self.goClick = function() {};            
    }
    function enableGoButton(handler) {
        $goButton.addClass("yellow");
        self.goClick = handler;            
    }    
    
    function popClient($card, key, up) {
        var deck = deckByKey(key);
        var message = (up) ? "hoverUp" : "hoverDown";
        deck.pop($card, up);
        io.emit(message, key, deck.$cards.index($card));
    }
    
    function popOthers(key, cardIndex, up) {
        var deck = deckByKey(key);
        var $card = $(deck.$cards[cardIndex]);
        deck.pop($card, up);
    }
    
    function minimumHandlers() {
        disableGoButton();
        
        self.goClick = function() { };       
        self.bottomClick = function(el_card) { };
        self.mainClick = function(el_card) { };
        self.mainEnter = function(el_card) { };
        self.mainLeave = function(el_card) { };
        
        self.bottomEnter = function(el_card) {
            popClient($(el_card), clientId, true);
        };
        self.bottomLeave = function(el_card) {
            popClient($(el_card), clientId, false);
        };   
        self.otherEnter = function(deckKey, cardIndex) {
            popOthers(deckKey, cardIndex, true);
        };
        self.otherLeave = function(deckKey, cardIndex) {
            popOthers(deckKey, cardIndex, false);
        };
        self.otherToMain = function(cardIndex, roundCardValue) {
            bottom.to(main, cardIndex, roundCardValue);
        };
        self.otherFromMain = function(cardIndex) {
            main.to(bottom, cardIndex, "");
        };
    }  
    
    function defaultHandlers() {     
        minimumHandlers();
        
        self.mainEnter = function(el_card) {
            popClient($(el_card), "main", true);
        };
        self.mainLeave = function(el_card) { 
            popClient($(el_card), "main", false);
        };
    }
    
    function defaultState() {   
        main.removeAll();
        defaultHandlers();
    }
    
    function cleanState() {
        main.removeAll();
        minimumHandlers();
    }
    
    function addingState(nextState) {         
        function goOn() {
            var cards = main.getCards();
            defaultState();
            nextState(cards);
        }
        function updateGoButton() {
            if (main.isEmpty()) {
                disableGoButton();
            } else {
                enableGoButton(goOn);
            }
        }    
        self.bottomClick = function(el_card) {
            var index = bottom.to(main, $(el_card));
            updateGoButton();
            io.emit("setCard", index);
        };
        self.mainClick = function(el_card) {
            var index = main.to(bottom, $(el_card));
            updateGoButton();
            io.emit("removeCard", index);
        };
    }
    
    function choosingRoundCardState(chosenCards) {
        self.mainClick = function(el_card) {
            var roundCardValue = DeckDW.extractData($(el_card)).value;
            defaultState();
            io.emit("firstTurn", JSON.stringify(chosenCards), roundCardValue);            
        };
        
        main.set(ALL_ROUND_CARDS, "open");
    }
    
    function checkingState(cards) {       
        function believe() {
            defaultState();
            io.emit("some event to add state");
        };
        self.mainClick = function(el_card) {
            var checkedCardIndex = main.$cards.index(el_card);
            defaultState();
            io.emit("check", checkedCardIndex);
        };   
        
        main.set(cards, clientShirt);
        enableGoButton(believe);
    }
    
    function watchingState(mainCards, currentPlayerId) {
        cleanState(); 
        main.set(mainCards, ownerToShirt(currentPlayerId));
    }
    
    function revealState(revealCards, checkedIndex) {
        minimumHandlers();
        main.replace(checkedIndex, revealCards[checkedIndex], "open");
        main.update();
        setTimeout(function() {
            for (var i = 0; i < revealCards.length; i++) {
                if (i == checkedIndex) { continue; }
                main.replace(i, revealCards[i]);
            }
            main.update();
        }, REVEAL_DELAY);
    }
    
    this.update = function(mainCards, hasPileCards, currentPlayerId, checkedIndex) {
        if (checkedIndex) {
            revealState(mainCards, checkedIndex);
            return;
        }
        if (currentPlayerId !== clientId) {
            watchingState(mainCards, currentPlayerId);
            return;
        }
        //out turn!
        if (mainCards.length > 0) {
            checkingState(mainCards);
            return;
        }
        //one of addingState
        if (hasPileCards) {
            addingState(function(chosenCards) {
                io.emit("believe", JSON.stringify(chosenCards));
            });
        } else {
            addingState(choosingRoundCardState);
        }
    };
    
    return self;
}
