/* --- ACTIONS --- */

const actions = {
    generateSelArr: () => {
        
        return {
            type: 'GENERATE_SEL_ARR'
        }
    },
    changePlayersCount: (count) => {
        return {
            count: count,
            type: 'CHANGE_PLAYERS_COUNT'
        }
    },
    changeMafiaCount: (count) => {
        return {
            mafiaCount: count,
            type: 'CHANGE_MAFIA_COUNT'
        }
    },
    changeExtraCards: (card, inGame) => {
        return {
            card: card,
            inGame: inGame,
            type: 'CHANGE_EXTRA_CARDS'
        }
    },
    startGenerate: () => {
        return {
            type: 'START_GENERATE'
        }
    },
    generateCard: () => {
        return {
            type: 'GENERATE_CARD'
        }
    },
    nextPlayer: () => {
        return {
            type: 'NEXT_PLAYER'
        }
    },
    getResult: () => {
        return {
            type: 'GET_RESULT'
        }
    },
    resetAll: () => {
        return {
            type : 'RESET_ALL'
        }
    }
    
};