/*--- DATA FOR STORE ---*/

const data = localStorage.getItem("random-card-data") ? JSON.parse(localStorage.getItem("random-card-data")) :
{
    modes : ['init', 'normal', 'generated', 'finished', 'result'],
    mode : 'init',
    count : 15,
    mafiaCount : 4,
    current: 0,
    players : [],
    selArr: [],
    mafiaSelArr: [],
    cards : [],
    extraCards: {kam : true, sh : true, p : false, don: false}
}

/* --- REDUCERS --- */

function reducer(state = data, action) {
    switch (action.type) {
        case 'GENERATE_SEL_ARR':
            for (let j=8; j<=20; j++) if (!~state.selArr.indexOf(j)) state.selArr.push(j);
            
            return state;
        case 'CHANGE_PLAYERS_COUNT':
            let getMafiaSelArr = (cnt) => {
                if (cnt == 10 || cnt == 13) return [Math.floor(cnt/3)-1, Math.floor(cnt/3)];
                else return [Math.floor(cnt/3.5)];
            };
            let mafiaSelArr = getMafiaSelArr(action.count);
            return {...state, 
                    count: action.count, 
                    mafiaSelArr : mafiaSelArr, 
                    mafiaCount : mafiaSelArr[mafiaSelArr.length-1]};
        case 'CHANGE_MAFIA_COUNT':
        return {...state, 
            mafiaCount : action.mafiaCount};
        case 'CHANGE_EXTRA_CARDS':
            let extraCards = state.extraCards;
            extraCards[action.card] = action.inGame;
            return {...state, extraCards};
        case 'START_GENERATE':
            let cards = [];
            let checkExtraCards = (cnt, mafiaCnt) => {
                return { kam : cnt >= 10 && mafiaCnt >= 3, sh : cnt >= 13 && mafiaCnt >= 4,
                p : cnt >= 11, don : cnt >= 9 };
            }
            let extraCardsForCheck = checkExtraCards(state.count, state.mafiaCount);
            for (let i=0; i<state.mafiaCount - (state.extraCards.don && extraCardsForCheck.don); i++) cards.push("m");
            cards.push("man");
            cards.push("d");
            cards.push("k");
            
            for (let card in state.extraCards)
                if (state.extraCards[card] && extraCardsForCheck[card]) cards.push(card);
            for (let i=cards.length; i<state.count; i++) cards.push("");
            return {...state, cards : cards, mode : 'normal', current : 0};
        case 'GENERATE_CARD':
            state.cards.sort(function() { return Math.random() - 0.5 });
            state.players.push(state.cards.shift());
            return {...state, mode: 'generated'};
        case 'NEXT_PLAYER':
            return {...state, current : state.current+1, mode : state.current < state.count - 1 ? 'normal' : 'finished'};
        case 'GET_RESULT':
            return {...state, mode : 'result'};
        case 'RESET_ALL':
            window.scrollTo(0, 0);
            return {...state, mode: 'init', cards: [], players : []};
    }
    return state;
}
