
/*
 DeckDW - deck data wrapper. To deal with JSON representation of cards
 Parameters:
     fieldSelector - CSS selector of html container which will hold all cards of this deck
     updateType - animation type. String. Possible values: horizontal, vertical, radial
     updateTime - time needed to perform update of the deck
     deadTime - time needed to perform removing animation
     popTime - time needed to perform pop animation
 */
function createDeckDW(fieldSelector, updateType, updateTime, deadTime , popTime) {
    var deck = new Deck(fieldSelector, updateType, updateTime, deadTime , popTime);
    return new DeckDW(deck);
}
 
function DeckDW(deck) {
    
    function createMarkup(card, shirt) {
        var color = (card.suit && (card.suit === "♦" || card.suit === "♥")) ? "red" : "";
        var value = card.value || "";
        var suit = card.suit || "";
        var markup = "<div   class='card" + " " + shirt + " " + color + "' " +
                            "value='" + value + "' " +
                            "suit='" + suit + "'>\n" +
                        "<p>" + suit + "</p>\n" +
                     "</div>\n";
        return markup;
    };
    
    function extractKey($card) {
        var card = DeckDW.extract($card);
        return getKey(card);
    }
    
    function getKey(card) {
        return card.value + card.suit;
    }
    
    function $cardsEnumerator() {
        return Enumerable.From(deck.$cards).select(function(el) { return $(el); });
    }
    
    function addIdentic$Cards(markup, cardCount){
        Enumerable
        .Generate(function() { return $(markup); }, cardCount)
        .ForEach(function($card) { deck.add$Card($card); });          
    }
    
    function setOther(currentCount, shirt, cardValue) {     
        function $cardsWithGivenShirt() {
            return $cardsEnumerator().Where(function($card) {
                    return $card.hasClass(shirt);
                } );
        }
        function increase(count) {
            var markup = createMarkup({value: cardValue}, shirt);
            addIdentic$Cards(markup, count);           
        }
        function decrease(count) {
            //we gonna remove cards, so we use ToArray to save enumeration order
            var garbage = $cardsWithGivenShirt().Take(count).ToArray();
            Enumerable
            .From(garbage)
            .ForEach(function($card) { deck.remove$Card($card); });
        }
        
        var diff = currentCount - $cardsWithGivenShirt().Count();
        if (diff > 0) {
            increase(diff);
        } else {
            decrease(Math.abs(diff));
        }
    }

    function setOpen(currentCards) {
        function removeObsolete(prev, cur) {
            var to$Card = $cardsEnumerator().Select().ToDictionary(extractKey, "$");
            var obsoleteCards = Enumerable.From(prev).Except(cur, getKey);
            var discard =  function(card) {
                var key = getKey(card);
                var $card = to$Card.Get(key);
                deck.remove$Card($card);
            };
            obsoleteCards.forEach(discard);
        }     
        function addNew(prev, cur) {
            var newCards = Enumerable.From(cur).Except(prev, getKey);
            var attach = function(card) { deck.addCard(card, "open"); };
            newCards.forEach(attach);            
        }
        
        var previousCards = deck.getCards();
        removeObsolete(previousCards, currentCards);
        addNew(previousCards, currentCards);
    }
    
    function setPile(currentCards, ownerToShirt) {
        Enumerable
        .From(currentCards)
        .GroupBy("$.owner")
        .ForEach(function(group) {
            var count = group.Count();
            var owner = group.Key();
            var shirt = ownerToShirt(owner);
            var roundCardValue = group.First().value;
            setOther(count, shirt, roundCardValue);
        });
    }
    
    deck.set = function() {
        var args = arguments;
        var signature = Enumerable
            .From(args)
            .Select(function(arg) { return jQuery.type(args); })
            .ToString(", ");
            
        switch(signature) {
            case "array, string":
                setOpen(args[0]);
                break;
            case "array, function":
                setPile(args[0], args[1]);
                break;
            case "number, string":
                setOther(args[0], args[1]);
                break;
            case "number, string, string":
                setOther(args[0], args[1], args[2]);
                break;
            default:
                console.error("Unknown signature: " + signature);
        }
        deck.update();
    };
    
    deck.to = function(otherDeck, cardArg, cardValue) {
        var $card = (cardArg.jquery) ? cardArg : deck.get(cardArg);
        var index = (cardArg.jquery) ? deck.$cards.index($card) : cardArg;
        var shirt = DeckDW.extractShirt($card);
        var card = DeckDW.extract($card);
        card.value = (cardValue) ? cardValue : card.value;
        
        deck.remove$Card($card);
        deck.update();
        otherDeck.addCard(card, shirt);
        otherDeck.update();
        
        return index;
    };

    deck.getCards = function(owner) {
        function cardWithOwner($card) {
            var card = DeckDW.extract($card);
            card.owner = owner;
            return card;
        }
        return $cardsEnumerator().Select(cardWithOwner).ToArray();
    };
    
    deck.addCard = function(card, shirt) {
        var $card = $(createMarkup(card, shirt));
        deck.add$Card($card);
    };
    
    deck.removeCard = function(index) {
        var $card = $(deck.$cards.get(index));
        deck.remove$Card($card);
    };

    return deck;
}

/*
 Extract JSON data from jQuery object
 Parameters:
    $card - jQuery object
 Return:
    JSON data object {owner, suit, value} without owner
 */
DeckDW.extract = function($card) {
    return { value: $card.attr('value'), suit: $card.attr('suit') };
};

DeckDW.extractShirt = function($card) {
    if ($card.hasClass("open")) {
        return "open";
    }
    var found = $card.attr("class").match(/(shirt\d)/);
    return (found) ? found[0] : "";
};







