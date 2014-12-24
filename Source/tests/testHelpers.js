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