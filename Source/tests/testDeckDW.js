var timings = { updateTime: 700, deadTime: 1200, popTime: 400};

function createBottomDeck() {
    var bottomDeck = createDeckDW('.player-bottom', 'horizontal', timings );
    return bottomDeck;
}

function createMainDeck() {
    var mainDeck = createDeckDW('.main-field', 'horizontal', timings);
    return mainDeck;
}

function createSample1() {
    var sample = [
        {value: "K", suit: "♦"},
        {value: "Q", suit: "♦"},
        {value: "8", suit: "♦"}
    ];
    return sample;
}

QUnit.test( "DeckDW deck.addCard", function(assert) {
    var deck = createBottomDeck();
    var sampleCards = createSample1();
    for (var i = 0; i < sampleCards.length; i++) {
        deck.addCard(sampleCards[i], "open");
        var cards = deck.getCards();
        assert.equal(cards.length, i + 1, "the number of cards must be " + i);
    }   
    
    var cards = deck.getCards();
    assert.deepEqual(cards, sampleCards, "it must be the same cards");
});

QUnit.test( "DeckDW deck.removeCard", function(assert) {
    var deck = createBottomDeck();
    var sampleCards = createSample1();
    for (var i = 0; i < sampleCards.length; i++) {
        deck.addCard(sampleCards[i], "open");
    }   
    
    for (var i = sampleCards.length - 1; i >= 0; i--) {
        deck.removeCard(0);
        var cards = deck.getCards();
        assert.equal(cards.length, i, "there must be " + i + " cards left");
    }
});

QUnit.test( "DeckDW deck.getCards default owership", function(assert) {
    var deck = createBottomDeck();
    var sampleCard = {value: "Q", suit: "♦"};
    deck.addCard(sampleCard, "open"); 
    
    assert.deepEqual(deck.getCards(1)[0].owner, 1, "owner must be 1");
    assert.deepEqual(deck.getCards(2)[0].owner, 2, "owner must be 2");
});

QUnit.test( "DeckDW no shirt error in deck.addCard", function(assert) {
    var deck = createBottomDeck();
    var sampleCard = {value: "Q", suit: "♦"};
    assert.throws(
        function() {
          deck.addCard(sampleCard, "");
        },
        /No shirt given\. Card must have shirt/,
        "it must raise error if there is no shirt"
    );
});

QUnit.test( "DeckDW unknown signature error in deck.set", function(assert) {
    var deck = createBottomDeck();
    assert.throws(
        function() {
          deck.set(4, 4, 4);
        },
        /Unknown signature: number, number/,
        "it must raise error if signature is unknown"
    );
});

QUnit.test( "DeckDW deck.set open cards (signature: cards, 'open')", function(assert) {
    var deck = createBottomDeck();
    var sample1 = createSample1();
    var sample2 = createSample1();
    sample2.pop();
    sample2.push({value: "7", suit: "♦"}, {value: "6", suit: "♦"});
    
    deck.set(sample1, "open");
    assert.deepEqual(deck.getCards(), sample1, "it must be the same cards");
    
    deck.set(sample2, "open");
    assert.deepEqual(deck.getCards(), sample2, "it must reflect changes");
    assert.notDeepEqual(deck.getCards(), sample1, "they must be different");  
});

QUnit.test( "DeckDW deck.set cards of other players (signature: cardsCount, 'shirt')", function(assert) {
    var deck = createBottomDeck();
    
    deck.set(5, "shirt1");
    assert.equal(deck.getCards().length, 5, "number of cards must increase");
    deck.set(3, "shirt1");
    assert.equal(deck.getCards().length, 3, "number of cards must decrease"); 
    deck.set(1, "shirt1");
    assert.deepEqual(deck.getCards()[0], {value: "", suit: ""}, "must contain empty card");
    deck.set(0, "shirt1");
    assert.equal(deck.getCards().length, 0, "must be empty"); 
});

QUnit.test( "DeckDW deck.set cards of other players with default value (signature: cardsCount, 'shirt', 'default value')", function(assert) {
    var deck = createBottomDeck();  
    deck.set(3, "shirt1", "K");
    for (var i = 0; i < 3; i++) {
        assert.deepEqual(deck.getCards()[i], {value: "K", suit: ""}, "must contain K value");
    }
});

QUnit.test( "DeckDW deck.set cards of other players (signature: cards, 'shirt')", function(assert) {
    var deck = createBottomDeck();  
    var sample1 = [{value: "7"}, {value: "7"}];
    deck.set(sample1, "shirt1");
    for (var i = 0; i < 2; i++) {
        assert.deepEqual(deck.getCards()[i], {value: "7", suit: ""}, "must contain 7 value");
    }
});

QUnit.test( "DeckDW deck.set pile cards (signature: cardsWithOwners, ownerToShirtFunction)", function(assert) {
    var deck = createBottomDeck();
    var sample = [ 
        {value: "6", owner: 0},
        {value: "6", owner: 1},
        {value: "6", owner: 1},
        {value: "6", owner: 2}
    ];
    
    deck.set(sample, getShirt);
    
    assert.equal(deck.$field.find(".shirt1").length, 1);
    assert.equal(deck.$field.find(".shirt2").length, 2);
    assert.equal(deck.$field.find(".shirt3").length, 1);
});

QUnit.test( "DeckDW deck.to (signature: otherDeck, cardIndex)", function(assert) {
    var main = createMainDeck();
    var bottom = createBottomDeck();
    var sample = [
        {value: "K", suit: "♦"},
        {value: "Q", suit: "♦"}
        ];    
        
    bottom.set(sample, "open");
    bottom.to(main, 0);
    
    assert.equal(main.getCards().length, 1, "must increase");
    assert.equal(bottom.getCards().length, 1, "must decrease");

    assert.deepEqual(main.getCards()[0], sample[0], "must be equal");
    assert.deepEqual(bottom.getCards()[0], sample[1], "must be equal");
});

QUnit.test( "DeckDW deck.to (signature: otherDeck, cardIndex)", function(assert) {
    var main = createMainDeck();
    var bottom = createBottomDeck();
        
    bottom.set(2, "shirt1");
    bottom.to(main, 0);
    
    assert.equal(main.getCards().length, 1, "must increase");
    assert.equal(bottom.getCards().length, 1, "must decrease");
    
    var shirt = DeckDW.extractShirt($(main.$cards[0]));
    assert.equal(shirt, "shirt1", "must be the same shirt");

    assert.deepEqual(main.getCards()[0], {value: "", suit: ""}, "must be equal");
    assert.deepEqual(bottom.getCards()[0], {value: "", suit: ""}, "must be equal");
});

QUnit.test( "DeckDW deck.to (signature: otherDeck, $card)", function(assert) {
    var main = createMainDeck();
    var bottom = createBottomDeck();
    var sample = [
        {value: "K", suit: "♦"},
        {value: "Q", suit: "♦"}
        ];    
        
    bottom.set(sample, "open");
    var $card = $(bottom.$cards[0]);
    var index = bottom.to(main, $card);
    
    assert.equal(main.getCards().length, 1, "must increase");
    assert.equal(bottom.getCards().length, 1, "must decrease");
    assert.equal(index, 0, "index must be 0");
    
    var shirt = DeckDW.extractShirt($(main.$cards[0]));
    assert.equal(shirt, "open", "must be the same shirt");
    
    assert.deepEqual(main.getCards()[0], sample[0], "must be equal");
    assert.deepEqual(bottom.getCards()[0], sample[1], "must be equal");
});

QUnit.test( "DeckDW deck.to (signature: otherDeck, cardIndex, cardValue)", function(assert) {
    var main = createMainDeck();
    var bottom = createBottomDeck();
        
    bottom.set(2, "shirt1");
    bottom.to(main, 0, "9");

    assert.deepEqual(main.getCards()[0], {value: "9", suit: ""}, "must be equal");
    assert.deepEqual(bottom.getCards()[0], {value: "", suit: ""}, "must be equal");
});

QUnit.test( "DeckDW extract", function(assert) {
    var bottom = createBottomDeck();
    var card = {value: "7", suit: "♦"};
    bottom.addCard(card, "open");
    var $card = $(bottom.$cards[0]);
    
    assert.deepEqual(DeckDW.extract($card), card);
});

QUnit.test( "DeckDW extractShirt", function(assert) {
    var bottom = createBottomDeck();
    var card = {value: "", suit: ""};
    bottom.addCard(card, "shirt3");
    var $card = $(bottom.$cards[0]);
    
    assert.equal(DeckDW.extractShirt($card), "shirt3");
});

QUnit.test( "DeckDW deck.replace", function(assert) {
    var bottom = createBottomDeck();
    var sample = [
        {value: "K", suit: "♦"},
        {value: "Q", suit: "♦"}
        ];    
        
    bottom.set(2, "shirt2");
    bottom.replaceCard(0, sample[0], "open");
    bottom.replaceCard(1, sample[1], "open");
    bottom.update();
    
    assert.deepEqual(bottom.getCards(), sample, "old cards should have been replaced");
});
