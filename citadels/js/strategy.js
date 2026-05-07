App.Strategy = Ember.Object.extend({
	game: null,
	player: null,
	enemy: null,
	timer_interval: null,
	timeout : null,
	init() {
		this.set('enemy', this.get('game').get('player2') === this.get('player') ? 
		this.get('game').get('player1') : this.get('game').get('player2'));
		var that = this;
		this.get('game').addObserver('activePlayer', function() {
			if (this.get('activePlayer') === that.get('player'))
				that.execStrategy(5000);	
		});
		this.get('game').addObserver('phaze', function() {
			if (this.get('phaze')!='action' && this.get('activePlayer') === that.get('player'))
				that.execStrategy(3000);
		});
		this.get('game').addObserver('currentCharacter', function() {
			if (this.get('currentCharacter') && this.get('currentCharacter').get('player') === that.get('player'))
				that.execStrategy(5000);
		});
		this.addObserversPlayers();
		
	},
	addObserversPlayers : function() {
		var that = this;
		this.get('player').addObserver('on_graveyard', function() {
			    that.execStrategy(1000);
		});
		this.get('player').addObserver('on_coronation', function() {
			    that.execStrategy(1000);
		});
		this.get('enemy').addObserver('on_graveyard', function() {
			    that.execStrategy(1000);
		});
		this.get('enemy').addObserver('on_coronation', function() {
			    that.execStrategy(1000);
		});
	},
	resetTimer : function() {
		clearInterval(this.get('timer_interval'));
		this.set('timer_interval', null);
	},
	execStrategy : function(time) {
		var that = this;
		clearInterval(this.get('timer_interval'));
		clearTimeout(this.get('timeout'));
		this.set('timeout', setTimeout(function() {that.strategy();}, time));
		this.get('player').set('time', time/1000);
		this.set('timer_interval', setInterval(function() {that.get('player').set('time', that.get('player').get('time') ? that.get('player').get('time')-1 : 0);},1000));
	},
	strategy : function() {
		if (this.get('player').get('on_coronation')) this.coronationStrategy();
		if (this.get('player').get('on_graveyard')) this.graveyardStrategy();
		if (this.get('game').get('activePlayer') !== this.get('player')) return;
		if (this.get('game').get('phaze') == 'choose') this.chooseStrategy();
		else if (this.get('game').get('phaze') == 'discard') this.discardStrategy();
		else if (this.get('game').get('phaze') == 'action') this.actionStrategy();
	},
	isPossibleEnemyCharacter(number) {
		return this.get('enemy').get('possible_characters').contains(number);
	},
	kingChance : function() {
		if (this.get('game').get('characters').get('content').findBy('name', 'Witch')) return 0;
		if (this.get('game').get('characters').get('content').findBy('name', 'Navigator')) return 0.6;
		return 0.3;
	},
	dangerCharacters : function() {
		var characters = this.get('game').get('characters').get('content').rejectBy('player', this.get('player'));
		var danger_characters = [];
		var in_round = ['choose','discard'].indexOf(this.get('game').get('phaze')) > -1;
		if (in_round) characters = characters.filterBy('status', 'in_round');
		if (characters.findBy('number', 1))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('number', 1));
		if (in_round && this.get('player').get('has_crown') && characters.findBy('name', 'Thief') && this.get('enemy').get('coins') > 2)
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Thief'));
		if (characters.findBy('name', 'Warlord') && this.warlordIsDangerous() && (in_round || (!in_round && this.isPossibleEnemyCharacter(8))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Warlord'));
		if (in_round && this.get('player').get('has_crown') && 
		        characters.findBy('name', 'Magician') && 
		        this.get('enemy').get('cards').length > this.get('player').get('cards').length + 2)
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Magician'));
		if ((this.get('player').get('coins') > 2 || (this.get('player').get('characters').findBy('name', 'Magician') && this.magicianIsUseful()) ||
		    (in_round && 
		    (this.get('player').get('characters').findBy('name', 'Witch') || 
		     this.get('player').get('characters').findBy('name', 'Alchemist') || 
		     this.get('player').get('characters').findBy('name', 'Architect'))
		     && this.get('player').get('characters').length == 2))
		    && characters.findBy('name', 'Thief') && (in_round || (!in_round && this.isPossibleEnemyCharacter(2)))) 
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Thief'));
		if ((!this.get('player').get('characters').findBy('name', 'Bishop') || !this.get('player').get('has_crown')) &&
		     this.hasUsefulDistricts(this.get('player'), true) && !this.get('player').get('closed') &&
			characters.findBy('name', 'Diplomat') && (in_round || (!in_round && this.isPossibleEnemyCharacter(8))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Diplomat'));
		if (Math.random() >= 0.5 && this.get('enemy').get('cards').length < 3 && 
		    this.get('player').get('cards').length > 1 &&
		    this.get('player').get('cards').length > this.get('enemy').get('cards').length
		    && characters.findBy('name', 'Magician') && (in_round || (!in_round && this.isPossibleEnemyCharacter(3))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Magician'));
		if (!this.endOfGame() && this.get('enemy').get('coins') > 3 && characters.findBy('name', 'Alchemist') && (in_round || (!in_round && this.isPossibleEnemyCharacter(6))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Alchemist'));
		if (this.get('enemy').get('coins') > 3 && characters.findBy('name', 'Architect') && (in_round || (!in_round && this.isPossibleEnemyCharacter(7))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Architect'));
		if (this.get('enemy').get('coins') > 3 && characters.findBy('name', 'Wizard') && this.get('enemy').get('cards').length && this.get('player').get('cards').length && (in_round || (!in_round && this.isPossibleEnemyCharacter(3))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Wizard'));
		if (this.get('enemy').get('districts').filterBy('color', 'green').length + this.get('enemy').hasDistrict('school') > 2 - +!!this.get('enemy').get('cards').length && characters.findBy('name', 'Merchant') && (in_round || (!in_round && this.isPossibleEnemyCharacter(6)))) 
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Merchant'));
	    if (this.get('enemy').get('districts').filterBy('color', 'blue').length + this.get('enemy').hasDistrict('school') > 2 - +!!this.get('enemy').get('cards').length && characters.findBy('number', 5) && (in_round || (!in_round && this.isPossibleEnemyCharacter(5)))) 
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('number', 5));
		if (in_round && characters.findBy('name', 'King') && !this.endOfGame() && (in_round || (!in_round && this.isPossibleEnemyCharacter(4))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'King'));
		if (characters.findBy('number', 4) && this.get('enemy').get('districts').filterBy('color', 'yellow').length + this.get('enemy').hasDistrict('school') > 2 - +!!this.get('enemy').get('cards').length
				 && (in_round || (!in_round && this.isPossibleEnemyCharacter(4))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('number', 4));  
		if (this.get('player').get('has_crown') && this.get('player').get('characters').findBy('number', 8) && characters.findBy('name', 'Bishop') && (in_round || (!in_round && this.isPossibleEnemyCharacter(5))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Bishop'));
		if (this.get('player').get('characters').findBy('name', 'Witch') && in_round && this.isPossibleEnemyCharacter(8) && characters.findBy('name', 'Bishop'))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Bishop'));
		if (!this.get('enemy').get('cards').length && characters.findBy('name', 'Architect') && (in_round || (!in_round && this.isPossibleEnemyCharacter(7))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Architect'));
		if (characters.findBy('name', 'Navigator') && (this.get('enemy').hasDistrict('treasury') || this.get('enemy').hasDistrict('maproom'))
		         && this.isPossibleEnemyCharacter(7))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Navigator'));
		if (in_round && this.get('enemy').get('coins') > 2 && characters.findBy('name', 'Thief'))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Thief'));
		if (in_round && this.get('enemy').get('cards').length > this.get('player').get('cards').length + 2 && characters.findBy('name', 'Magician'))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Magician'));
		if (!in_round && characters.findBy('name', 'Wizard') && this.get('player').get('cards') == 1 && this.isPossibleEnemyCharacter(3))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Wizard'));
		if (!in_round && characters.findBy('name', 'Emperor') && !this.get('player').get('coins') && this.get('player').get('cards') && this.isPossibleEnemyCharacter(4))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Emperor'));
		if (!in_round && characters.findBy('name', 'Tax') && this.get('game').get('currentCharacter').get('built') && this.get('player').get('coins') < 3 && this.isPossibleEnemyCharacter(2))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('name', 'Tax'));
		if (characters.findBy('number', 6) && Math.random() >= 0.5 && (in_round || (!in_round && this.isPossibleEnemyCharacter(6))))
			danger_characters = this.pushCharacter(danger_characters, characters.findBy('number', 6));
		return danger_characters.slice(0, 2);
	},
	pushCharacter : function(characters, character) {
		if (!characters.contains(character))
		{
			characters.pushObject(character);
		}
		return characters;
	},
	dangerCharacter : function(in_round) {
		var danger_characters = this.dangerCharacters();
		var in_round = in_round || false;
		var danger_chance = this.get('game').get('characters').get('content').findBy('name', 'Witch') &&
		this.isPossibleEnemyCharacter(1) && danger_characters.length && danger_characters.objectAt(0).get('name') != 'King' ? 0.35 : 
		(!danger_characters.findBy('name', 'King') && danger_characters.length && danger_characters.objectAt(0).get('name') == 'Warlord' && 
		 this.get('game').get('characters').get('content').filterBy('status', 'in_round').filterBy('name','Bishop').length ? 0.4 : 0.5);
		if (this.get('game').get('phaze') == 'choose') {
			var king = in_round ? danger_characters.findBy('name', 'King') && Math.random() < this.kingChance() : 0;
			switch (danger_characters.length) {
				case 0: return this.randomCharacter();
				case 1: return (king ? danger_characters.findBy('name', 'King') : 
								(Math.random() < danger_chance ? danger_characters.objectAt(0) : this.randomCharacter()));
				case 2: return (king ? danger_characters.findBy('name', 'King') : 
								(Math.random() < danger_chance ? danger_characters.objectAt(0) : danger_characters.objectAt(1)));			
			}
		} else return danger_characters.length > 0 ? danger_characters.objectAt(0) : this.randomCharacter();
	},
	magicianIsUseful : function() {
		var useful = false;
		var a = this.get('enemy').get('cards').length;
		var b = this.get('player').get('cards').length + 1;
		if (this.get('player').get('characters').filterBy('name', 'Assassin').length) b--;
		if (this.get('player').get('characters').filterBy('number', 2).length) b--;
		var c = this.get('player').get('cards').filterBy('cost', 1).length + this.get('player').get('cards').filterBy('cost', 2).length;
		var d = this.get('player').get('cards').filterBy('cost', 3).length > 1 && this.get('player').get('coins') > 1;
		if (c > 1 || d) b--;
		if (a > b) useful = true;
		return useful;
	},
	warlordIsDangerous : function() {
		if (this.get('enemy').get('score') == 0 && this.get('player').get('score') == 0) return false;
		if (this.get('player').get('has_crown') && this.get('player').get('characters').findBy('name', 'Bishop')) return false;
		if (this.get('player').get('closed')) return false;
		if (this.get('enemy').get('coins') < 2 && this.get('enemy').get('districts').filterBy('color','red').length < 1 &&
		    this.get('player').get('districts').filterBy('cost', 1).length < 1 && !this.get('player').hasDistrict('greatwall')) return false;
		if (this.get('enemy').get('coins') + this.get('enemy').get('districts').filterBy('color','red').length + this.get('enemy').hasDistrict('school') <
		this.get('player').get('score') - this.get('enemy').get('score') + this.get('player').get('coins') + this.get('player').hasDistrict('greatwall') - 1) return false;
		if (this.get('player').get('districts').length >= this.get('enemy').get('districts').length + 2) return false;
		return true;
	},
	usefulCharacter : function() {
		var characters = this.get('game').get('characters').get('content').filterBy('status', 'in_round');
		var useful_character;
        if (characters.findBy('number', 1))
			useful_character = characters.findBy('number', 1);
        else if ((this.get('enemy').get('coins') > 2 || (this.get('player').get('coins') > 3 && !this.get('player').get('characters').findBy('number',1))) && characters.findBy('name', 'Thief'))
			useful_character = characters.findBy('name', 'Thief');
	    else if (Math.random() > 0.6 && this.get('enemy').get('cards').length < 3 && 
		    this.get('player').get('cards').length > 1 &&
		    this.get('player').get('cards').length > this.get('enemy').get('cards').length
		    && characters.findBy('name', 'Magician') && !this.get('player').get('characters').findBy('number',1))
		    useful_character = characters.findBy('name', 'Magician');
		else if (this.get('player').get('coins') > 3 && characters.findBy('name', 'Architect'))
			useful_character = characters.findBy('name', 'Architect');
		else if (this.get('player').get('coins') > 2 && this.get('player').get('cards').length && !this.hasAllDublicates() && characters.findBy('name', 'Alchemist')
		&& !this.endOfGame())
			useful_character = characters.findBy('name', 'Alchemist');
		else if (this.get('player').get('coins') > 3 && characters.findBy('name', 'Wizard') && this.get('enemy').get('cards').length > 1 && this.get('player').get('cards').length > 1)
			useful_character = characters.findBy('name', 'Wizard');
		else if (this.isUsefulColor('green', 0) && characters.findBy('name', 'Merchant'))
			useful_character = characters.findBy('name', 'Merchant');
		else if (this.isUsefulColor('red', 1) && characters.findBy('number', 8))
			useful_character = characters.findBy('number', 8);
		else if (characters.findBy('name', 'Magician') && this.magicianIsUseful())
			useful_character = characters.findBy('name', 'Magician');
		else if (this.isUsefulColor('blue', 1) && characters.findBy('number', 5))
			useful_character = characters.findBy('number', 5);
		else if (this.isUsefulColor('yellow', 1) && characters.findBy('name', 'King'))
			useful_character = characters.findBy('name', 'King');
		else if (this.isPossibleEnemyCharacter(8) && 
		         characters.findBy('name', 'Bishop') && this.isUsefulColor('blue', 0) &&
		         this.get('game').get('characters').get('content').findBy('name', 'Warlord'))
			useful_character = characters.findBy('name', 'Bishop');
		else if ((!this.get('player').get('cards').length || this.hasAllDublicates()) && characters.findBy('name', 'Architect'))
			useful_character = characters.findBy('name', 'Architect');
		else if ((!this.get('player').get('cards').length || this.hasAllDublicates()) && characters.findBy('name', 'Wizard') && this.get('enemy').get('cards').length > 1)
			useful_character = characters.findBy('name', 'Wizard');	
		else if (this.hasUsefulDistricts(this.get('enemy'), !!characters.findBy('name', 'Diplomat')) && !this.endOfGame() && characters.findBy('number', 8))  
			useful_character = characters.findBy('number', 8);
		else if (((this.get('player').get('possible_characters').contains(4) && this.get('player').get('coins') < 4) || this.get('player').hasDistrict('treasury') || this.get('player').hasDistrict('maproom'))
		&& characters.findBy('name', 'Navigator'))
			useful_character = characters.findBy('name', 'Navigator');
		else if (characters.findBy('name', 'Merchant'))
			useful_character = characters.findBy('name', 'Merchant');
		
		return useful_character;
	},
	isUsefulColor : function(color, min_cnt) {
		return this.get('player').get('districts').filterBy('color', color).length > min_cnt || this.get('player').get('cards').filterBy('color', color).length > min_cnt;
	},
	randomCharacter : function() {
		var characters = this.get('game').get('characters').get('content').filterBy('status', 'in_round');
		if ((this.get('player').get('has_crown') || this.endOfGame()) && !this.get('player').get('characters').findBy('number', 8)) 
			characters = characters.rejectBy('name', 'Navigator');
		var random_character = characters.objectAt(Math.floor(Math.random() * characters.length));
		return random_character;
	},
	chooseStrategy : function() {
		this.get('player').takeCharacter((this.get('player').get('has_crown') || this.get('player').get('characters').findBy('number', 1)) &&
		(!this.get('game').get('characters').get('content').findBy('name','Thief') || !this.isPossibleEnemyCharacter(2))
		? this.usefulCharacter() || this.randomCharacter() : this.dangerCharacter(true));
		this.get('game').changePhaze();
	},
	discardStrategy : function() {
		this.get('player').discardCharacter(this.dangerCharacter(true));
		this.get('game').changePhaze();
	},
	checkWillRobbed : function() {
		var will_robbed = false;
		var that = this;

		if (this.get('game').get('currentCharacter') !== this.get('player').get('characters').sortBy('number').objectAt(1)
		    && this.get('player').get('characters').sortBy('number').objectAt(1).get('state') == 'robbed')
		 {
		   will_robbed = true;
		   if (this.get('game').get('currentCharacter').get('state') == 'normal' &&
		       this.get('game').get('currentCharacter').get('can_build'))
			   this.get('player').get('cards').forEach(function(card) {
				 if (that.get('player').hasDistrict(card.get('name')) <= that.get('player').hasDistrict('quarry'))
				 {
					if (that.enoughCoinsToBuild(card)) will_robbed = false;
				 }
			   });
		 }

		 return will_robbed;
	},
	checkChooseCard : function() {
			
		if (this.get('game').get('currentCharacter').get('name') == 'Witch' &&
		this.get('player').get('coins') < 3)
			return this.get('game').get('characters').get('content').findBy('name', 'Thief') 
			&& this.isPossibleEnemyCharacter(2)
			&& Math.random() < 0.5 ? true : false;
		
		if (this.checkWillRobbed())
		{
			return true;
		}
		
		if (this.get('game').get('currentCharacter').get('name') == 'Thief' && this.get('game').get('currentCharacter').get('state') == 'bewitched')
			return true;
		
		if (this.get('player').get('characters').findBy('name', 'Architect') && 
		['assassinated','bewitched'].indexOf(this.get('player').get('characters').findBy('name', 'Architect').get('state')) < 0 &&
		this.get('player').get('coins') < 9 &&
		(this.get('game').get('currentCharacter').get('name') != 'Alchemist' || 
		 this.get('game').get('currentCharacter').get('state') != 'normal' ||
		 !this.get('player').get('coins')))
		{	
			return false;
		}
		
		if (this.get('game').get('first_full_city') && this.get('player').hasDistrict('treasury'))
			return false;
		if (this.get('game').get('first_full_city') && this.get('player').hasDistrict('maproom'))
			return true;
		
		if (this.get('game').get('currentCharacter').get('name') == 'Magician' && 
		    (this.get('enemy').get('cards').length || this.hasAllDublicates()) &&
		    this.get('player').get('coins') <= 6)
		{
			return false;
		}
		
		if (this.get('game').get('currentCharacter').get('name') == 'Wizard' && this.get('enemy').get('cards').length &&
		    this.get('player').get('coins') <= 6)
		{
			return false;
		}
			
		if (this.get('game').get('currentCharacter') !== this.get('player').get('characters').sortBy('number').objectAt(1)
		    && this.get('player').get('characters').findBy('name', 'Magician') && (this.get('enemy').get('cards').length || this.hasAllDublicates())
		     && this.get('player').get('coins') <= 6)
		    {
				return false;
			}
		
		if (this.get('game').get('currentCharacter') !== this.get('player').get('characters').sortBy('number').objectAt(1)
		    && this.get('player').get('characters').findBy('name', 'Wizard') && this.get('enemy').get('cards').length > 1  &&
		    this.get('player').get('coins') <= 6)
		    {
				return false;
			}
			
	    if (this.get('game').get('currentCharacter').get('number') < 3 && 
	        (!this.get('player').get('cards').length || this.hasAllDublicates()) &&
	        this.get('player').get('coins') < 2 && this.isPossibleEnemyCharacter(3) &&
	      (this.get('game').get('characters').get('content').findBy('name','Wizard') || this.get('enemy').get('cards').length < 2 ) )
	        {
				return false;
			}
		    
		if (!this.get('player').get('cards').length || this.hasAllDublicates())
		{
			return true;
		}
		
		if (this.endOfGame() && 
		    (this.get('player').get('characters').sortBy('number').objectAt(1) === this.get('game').get('currentCharacter') ||
		    ['assassinated','bewitched'].indexOf(this.get('player').get('characters').sortBy('number').objectAt(1).get('state')) > -1) &&
		    this.get('game').get('currentCharacter').get('name') !== 'Navigator' && (function(that) {
		     	var ret = true;
		     	that.get('player').get('cards').forEach(function(card) {
		     		if (that.enoughCoinsToBuild(card)) ret = false;
		     	});
		     	return ret;
		     })(this)) return true;
		
		var player_cards = this.get('player').get('cards').sortBy('cost');
		var that = this;
		player_cards.forEach(function(card) {
			if (that.get('player').hasDistrict(card.get('name')) > that.get('player').hasDistrict('quarry'))
				player_cards = player_cards.rejectBy('name', card.get('name'));
		});
		
		if (this.get('game').get('currentCharacter').get('name') == 'Alchemist' && this.get('game').get('currentCharacter').get('state') == 'normal'
		    && this.get('player').get('coins'))
		{
			if (this.get('player').get('coins') + 2 < player_cards.objectAt(0).get('cost'))
				return true;
			else if (this.get('player').get('coins') > player_cards.get('lastObject').get('cost') + 1
			&& player_cards.get('lastObject').get('cost') < 5)
				return true;
		}
		
		if ((player_cards.length == 1 || this.endOfGame()) && 
		    this.get('player').get('coins') > player_cards.get('lastObject').get('cost') + 1)
			return true;

		return false;
	},
	cardToTake : function() {
		var cards_on_choice = this.get('game').get('deck').get('content').filterBy('status', 'on_choice');
		var random_card = cards_on_choice.objectAt(Math.floor(Math.random() * cards_on_choice.length));
		var card_to_take;
		var that = this;
		cards_on_choice.forEach(function(card) { 
			if (that.get('player').hasDistrict(card.get('name')) > that.get('player').hasDistrict('quarry'))
				cards_on_choice = cards_on_choice.rejectBy('name', card.get('name'));
			if (that.get('game').get('currentCharacter').get('name') == 'Witch' ||
			    that.get('game').get('currentCharacter').get('name') == 'Navigator')
			    return;
			if (!that.enoughCoinsToBuild(card))
				cards_on_choice = cards_on_choice.rejectBy('name', card.get('name'));
		});
		
		if (cards_on_choice.length > 0 && this.endOfGame()) card_to_take = cards_on_choice.sortBy('cost').objectAt(cards_on_choice.length-1);
		else if (this.get('game').get('currentCharacter').get('isColor') && 
		         cards_on_choice.findBy('color',  this.get('game').get('currentCharacter').get('color')) &&
		         this.get('player').get('coins') < 6)
			card_to_take = cards_on_choice.findBy('color',  this.get('game').get('currentCharacter').get('color'));
		else
		if (this.get('game').get('currentCharacter') !== this.get('player').get('characters').sortBy('number').objectAt(1) && 
		    this.get('player').get('characters').sortBy('number').objectAt(1).get('isColor') &&
		    cards_on_choice.findBy('color',  this.get('player').get('characters').sortBy('number').objectAt(1).get('color')))
		    card_to_take = cards_on_choice.findBy('color',  this.get('player').get('characters').sortBy('number').objectAt(1).get('color'));
		else
		if (cards_on_choice.length > 0)
			card_to_take = cards_on_choice.sortBy('cost').objectAt(cards_on_choice.length-1);
		else card_to_take = random_card;
		return card_to_take;
	},
	enoughCoinsToBuild : function(card) {
		var cost_to_build = card.get('cost');
		if (this.get('player').hasDistrict('factory') && card.get('color') == 'purple') cost_to_build--;
		var coins_to_get = this.get('player').get('coins') + 2;
		if (this.get('game').get('currentCharacter').get('name') == 'Merchant') coins_to_get++;
		if (this.get('game').get('currentCharacter').get('isColor')) {
			coins_to_get += this.get('player').get('districts').filterBy('color', this.get('game').get('currentCharacter').get('color')).length
						  + this.get('player').hasDistrict('school');
		}
		return cost_to_build <= coins_to_get;
	},
	endOfGame : function() {
		return this.get('player').get('districts').length >= this.get('player').get('districts_to_close') - 1 ||
			   this.get('enemy').get('districts').length >= this.get('enemy').get('districts_to_close') - 1;
	},
	actionStrategy : function() {		
		this.get('game').get('currentCharacter').thanksYourExcellency();
		
		var that = this;
		var to_use_workshop = false;
		var current_character = this.get('game').get('currentCharacter');
		
		if (this.get('game').get('currentCharacter').get('name') == 'Emperor' && 
		!this.get('game').get('currentCharacter').get('coronated') && 
		['bewitched', 'assassinated'].indexOf(this.get('game').get('currentCharacter').get('state')) < 0) {
			this.get('game').get('currentCharacter').coronate(this.get('game'), this.get('enemy'));
			if (this.get('enemy').get('on_coronation')) return;
		}
		
		this.destroyArmoryStrategy();
		
		if (this.checkChooseCard()) 
		{
			if (this.get('player').get('hasWorkshop')
			&& (this.get('game').get('currentCharacter').get('number') > 2 || 
			    !this.get('game').get('characters').get('content').findBy('name','Magician') ||
			    !this.isPossibleEnemyCharacter(3))) {
				this.get('game').get('currentCharacter').takeCoins(this.get('game'));
				to_use_workshop = true;
			}
			else {
				this.get('game').get('currentCharacter').chooseCard(this.get('game'));
				while (this.get('game').get('currentCharacter').get('took') < 1 + this.get('player').hasDistrict('library'))
					this.get('game').get('currentCharacter').takeCard(this.get('game'), this.cardToTake());
			}
		}
		else this.get('game').get('currentCharacter').takeCoins(this.get('game'));
		
		if (current_character!==this.get('game').get('currentCharacter')) return;
		
		if (this.get('game').get('currentCharacter').get('name') == 'Emperor' && 
		!this.get('game').get('currentCharacter').get('coronated')) {
			this.get('game').get('currentCharacter').coronate(this.get('game'), this.get('enemy'));
			if (this.get('enemy').get('on_coronation')) return;
		}
		
		if (this.get('game').get('currentCharacter').get('name') == 'Witch')
		{
			this.bewitchStrategy();
			this.get('game').get('currentCharacter').endTurn(this.get('game'));
			return;
		}
			
		if (this.get('game').get('currentCharacter').get('state') == 'bewitched' && 
		    this.get('game').get('currentCharacter').get('handle_player')!==this.get('player')) return;
		
		if (this.get('game').get('currentCharacter').get('isMagician')) this.magicianStrategy(true);
		
		if (to_use_workshop) this.get('game').get('currentCharacter').useWorkshop(this.get('game'));
		
		if (this.get('game').get('currentCharacter').get('name') == 'Navigator') {
			this.navigatorStrategy();
			this.get('game').get('currentCharacter').endTurn(this.get('game'));
			return;
		}
		
		if (this.checkWillUseAlchemist())
		{
			this.specialBuildStrategy();
			if (this.get('game').get('currentCharacter').get('isAssassin')) this.assassinStrategy();
			if (this.get('game').get('currentCharacter').get('isThief')) this.thiefStrategy();
			if (this.get('game').get('currentCharacter').get('isMagician')) this.magicianStrategy(true);
			if (this.get('game').get('currentCharacter').get('isWizard')) this.wizardStrategy();
			this.get('game').get('currentCharacter').endTurn(this.get('game'));
			return;
		}
		
		var user_cards = this.get('player').get('cards').sortBy('cost');
		var card_to_build;
		var color_cards;
		
		if (user_cards.findBy('name', 'school')) this.get('game').get('currentCharacter').build(this.get('game'), user_cards.findBy('name', 'school'));
		
		if (this.get('game').get('currentCharacter').get('isColor') && !this.endOfGame() && this.get('player').get('coins') < 6)
		{
		   color_cards = user_cards.filterBy('color', this.get('game').get('currentCharacter').get('color'));
		   for (var i=1; i<=color_cards.length; i++)
			{
				card_to_build = color_cards.objectAt(color_cards.length - i);
				this.get('game').get('currentCharacter').build(this.get('game'), card_to_build);
			}
 			
		}
		
		if (this.get('game').get('currentCharacter').get('isColor') && !this.checkWillRobbed()) this.get('game').get('currentCharacter').takeIncome();
		
		if (this.get('game').get('currentCharacter').get('number') < this.get('player').get('characters').sortBy('number').objectAt(1).get('number') && 
		    this.get('player').get('characters').sortBy('number').objectAt(1).get('isColor') && 
		    ['assassinated' , 'bewitched'].indexOf(this.get('player').get('characters').sortBy('number').objectAt(1).get('state')) < 0 &&
		    !this.endOfGame() && this.get('player').get('coins') < 6)
		{
		   user_cards = this.get('player').get('cards').sortBy('cost');
		   color_cards = user_cards.filterBy('color', this.get('player').get('characters').sortBy('number').objectAt(1).get('color'));
		   for (var i=1; i<=color_cards.length; i++)
			{
				card_to_build = color_cards.objectAt(color_cards.length - i);
				this.get('game').get('currentCharacter').build(this.get('game'), card_to_build);
			}
		}
		
		user_cards = this.get('player').get('cards').sortBy('cost');
		
		if (!this.endOfGame() && user_cards.length)
			for (var i=1; i<=user_cards.length; i++)
			{
				card_to_build = user_cards.objectAt(
				['Architect', 'Wizard', 'Warlord', 'Diplomat'].indexOf(this.get('game').get('currentCharacter').get('name')) > -1
				&& this.get('player').get('coins') < user_cards.get('lastObject').get('cost') * 2 ? 
				i - 1 : user_cards.length - i);
				this.get('game').get('currentCharacter').build(this.get('game'), card_to_build);
			}

		if (this.get('game').get('currentCharacter').get('isMagician')) this.magicianStrategy();
		
		user_cards = this.get('player').get('cards').sortBy('cost');
		for (var i=1; i<=user_cards.length; i++)
		{
			card_to_build = user_cards.objectAt(user_cards.length - i);
			this.get('game').get('currentCharacter').build(this.get('game'), card_to_build);
		}
				
		if (this.get('player').hasDistrict('lighthouse')) this.lighthouseStrategy();
		
		if (this.get('player').get('hasLab') && !this.checkWillRobbed() && (this.hasAllDublicates() || this.get('player').get('cards').length > 1))
			this.get('game').get('currentCharacter').useLab(this.get('player').get('cards').sortBy('cost').objectAt(
			this.get('game').get('currentCharacter').get('name') == 'Architect' || this.get('game').get('currentCharacter').get('name') == 'Wizard' ? 
			this.get('player').get('cards').length - 1 : 0));
		
		if (this.get('player').get('hasMuseum') && (this.hasAllDublicates() || this.get('player').get('cards').length > 1) || this.endOfGame())
			this.get('game').get('currentCharacter').underMuseum(this.get('game'), this.get('player').get('cards').sortBy('cost').objectAt(
			this.get('game').get('currentCharacter').get('name') == 'Architect' || this.get('game').get('currentCharacter').get('name') == 'Wizard' ? 
			this.get('player').get('cards').length - 1 : 0));
		
		user_cards = this.get('player').get('cards').sortBy('cost');
		for (var i=1; i<=user_cards.length; i++)
		{
			card_to_build = user_cards.objectAt(user_cards.length - i);
			this.get('game').get('currentCharacter').build(this.get('game'), card_to_build);
		}
		
		if (this.get('game').get('currentCharacter').get('isAssassin')) this.assassinStrategy();
		if (this.get('game').get('currentCharacter').get('isThief')) this.thiefStrategy();
		if (this.get('game').get('currentCharacter').get('isWizard')) this.wizardStrategy();
		if (this.get('game').get('currentCharacter').get('isDiplomat')) this.diplomatStrategy();
		if (this.get('game').get('currentCharacter').get('isWarlord')) this.warlordStrategy();
		
		if (this.get('player').get('hasArmory')) this.armoryStrategy();
		
		if (this.get('player').hasDistrict('belltower') &&
		    this.get('player').get('districts').length >
		    this.get('enemy').get('districts').length + this.get('enemy').get('has_crown')
		    && (this.get('enemy').get('characters').sortBy('number').objectAt(1).get('revealed')
		    || this.get('enemy').get('districts').length < this.get('enemy').get('districts_to_close') - 2
		    ))
		    this.get('player').ringTheBell(this.get('game'));
		
		if (!this.get('enemy').get('on_graveyard'))
			this.get('game').get('currentCharacter').endTurn(this.get('game'));
	},
	hasAllDublicates : function() {
		var that = this;
		var has = this.get('player').get('cards').length ? true : false;
		this.get('player').get('cards').forEach(function(card) {
			if (that.get('player').hasDistrict(card.get('name')) <= that.get('player').hasDistrict('quarry'))
				has = false;
		});
		return has;
	},
	hasUsefulDistricts : function(player, is_diplomat) {
		if (!player.get('districts').length) return false;
		if (player.hasDistrict('armory') || player.hasDistrict('treasury') || player.hasDistrict('museum')) return true;
		if (is_diplomat) return player.get('districts').filterBy('cost', 5).length || player.get('districts').filterBy('cost', 6).length;
		else return player.get('districts').filterBy('cost', 1).length || player.get('districts').filterBy('cost', 2).length || 
		player.get('districts').filterBy('cost', 3).length;
		
	},
	assassinStrategy : function() {
		var possible_characters = this.get('enemy').get('possible_characters');
		var r = 0.5;
		var chase_king = true;
		if (this.get('game').get('characters').get('content').findBy('name', 'Navigator') && 
		    this.get('enemy').get('districts').length >= 4) 
		    {
				possible_characters.splice(possible_characters.indexOf(7), 1);
				r = 0.25;
				chase_king = false;
			}
		var random_character_number = possible_characters.objectAt(Math.floor(Math.random() * possible_characters.length));
		var random_character = this.get('game').get('characters').get('content').findBy('number', random_character_number);
		var character_to_assassinate = 
		chase_king && this.get('game').get('characters').get('content').findBy('name', 'King') && this.isPossibleEnemyCharacter(4) && 
		!this.endOfGame() && Math.random() >= 0.5 ?
	    this.get('game').get('characters').get('content').findBy('name', 'King') : 
	    (Math.random() < r ? this.dangerCharacter() || random_character : random_character);
		this.get('game').get('currentCharacter').assassinate(character_to_assassinate);
	},
	bewitchStrategy : function() {
		var possible_characters = this.get('enemy').get('possible_characters');
		if (this.get('game').get('characters').get('content').findBy('name', 'Navigator') && 
		    this.get('enemy').get('districts').length >= 4) possible_characters.splice(possible_characters.indexOf(7), 1);
		var random_character_number = possible_characters.objectAt(Math.floor(Math.random() * possible_characters.length));
		var random_character = this.get('game').get('characters').get('content').findBy('number', random_character_number);
		var character_to_bewitch = Math.random() < 0.33 ? this.dangerCharacter() || random_character : random_character;
		this.get('game').get('currentCharacter').bewitch(character_to_bewitch);
	},
	thiefStrategy : function() {
		var possible_characters = this.get('enemy').get('possible_characters');

		var reject_character = this.get('enemy').get('characters').findBy('number', 1) || 
		 this.get('game').get('characters').get('content').findBy('state', 'assassinated') || 
		 this.get('game').get('characters').get('content').findBy('state', 'bewitched');
		
		if (reject_character) {
			possible_characters.splice(possible_characters.indexOf(reject_character.get('number')), 1);
		}
		
		var random_character_number = possible_characters.objectAt(Math.floor(Math.random() * possible_characters.length));
		this.get('game').get('currentCharacter').rob(this.get('game').get('characters').get('content').findBy('number', random_character_number));	
	},
	magicianStrategy : function(check_built) {
		var that = this;
		if (check_built) check_built = check_built && !this.get('game').get('currentCharacter').get('built');
		if (this.get('player').get('hasLab') && ((this.get('player').get('cards').length == 1 && this.get('enemy').get('cards').length) || this.hasAllDublicates()))
			this.get('game').get('currentCharacter').useLab(this.get('player').get('cards').objectAt(0));
		
		if (this.get('player').get('cards').length == 0 || 
		    (this.get('enemy').get('cards').length > this.get('player').get('cards').length + 1 - this.get('player').get('cards').length * this.hasAllDublicates() &&
		    (!check_built || this.hasAllDublicates())))
		{
			if (this.get('player').get('hasLab') && this.get('player').get('cards').length == 1)
				this.get('game').get('currentCharacter').useLab(this.get('player').get('cards').objectAt(0));
			if (this.get('player').get('hasMuseum') && this.get('player').get('cards').length == 1)
				this.get('game').get('currentCharacter').underMuseum(this.get('game'), this.get('player').get('cards').objectAt(0));
			this.get('game').get('currentCharacter').exchange_cards(this.get('game'), this.get('enemy'));
		}
		else {
			this.get('player').get('cards').forEach(function(card) {
				if (that.get('player').hasDistrict(card.get('name')) > that.get('player').hasDistrict('quarry')
				   || that.endOfGame() && card.get('cost') - (that.get('player').hasDistrict('factory') && card.get('color') == 'purple') > that.get('player').get('coins')) {
					that.get('game').get('currentCharacter').chooseToDiscard();
					card.set('isChecked', true);
				}	
			});
			this.get('game').get('currentCharacter').discardCards(this.get('game'));
		}
	},
	wizardStrategy : function() {
		if (this.get('enemy').get('cards').length)
		{
			var enemy_cards = this.get('enemy').get('cards').sortBy('cost');
			for (var j=enemy_cards.length-1; j>=0; j--)
				if (enemy_cards.objectAt(j).get('cost') <= this.get('player').get('coins'))
				{
					this.get('game').get('currentCharacter').stealCard(this.get('enemy'), enemy_cards.objectAt(j));
					this.get('game').get('currentCharacter').wizardBuild(this.get('game'), enemy_cards.objectAt(j));
				}	
			
			if (!this.get('game').get('currentCharacter').get('wizard_built'))
				this.get('game').get('currentCharacter').stealCard(this.get('enemy'), enemy_cards.objectAt(Math.floor(Math.random() * enemy_cards.length)));
		}
	},
	navigatorStrategy : function() {
		var take4cards = false;
		if (this.checkWillRobbed()) take4cards = true;
		if (!this.get('player').get('has_crown')
		&& this.get('game').get('characters').get('content').findBy('name', 'Thief')
		&& this.get('game').get('characters').get('content').findBy('name', 'Wizard')
		&& !this.get('player').get('characters').findBy('number', 8) && !this.get('game').get('first_full_city'))
			take4cards = true;
		if (this.get('player').hasDistrict('maproom') &&
		(this.get('game').get('characters').get('content').findBy('name', 'Wizard')
		|| this.get('game').get('first_full_city'))) 
		    take4cards = true;
		if (take4cards) this.get('game').get('currentCharacter').take4Cards(this.get('game'));
		else this.get('game').get('currentCharacter').take4Coins();
	},
	warlordStrategy : function() {
		var enemy_districts = this.get('enemy').get('districts').rejectBy('name', 'keep').sortBy('cost');
		if (enemy_districts.length)
		{
			var player_coins = this.get('player').get('coins');
			for (var coins = Math.round(player_coins / 2); coins <= player_coins; coins++)
				for (var i=enemy_districts.length-1; i>=0; i--)
					if (enemy_districts.objectAt(i).get('cost') - 1 + this.get('enemy').hasDistrict('greatwall') - (enemy_districts.objectAt(i).get('name') == 'greatwall') <= coins)
					{
						this.get('game').get('currentCharacter').destroy(this.get('game'), this.get('enemy'), enemy_districts.objectAt(i));
						return;
					}	
		}
	},
	diplomatStrategy : function() {
		if (this.get('enemy').hasDistrict('dragongate') || 
		    this.get('enemy').hasDistrict('university') ||
		    this.get('enemy').hasDistrict('school') ||
		    this.get('enemy').hasDistrict('hospital')) {
			this.get('game').get('currentCharacter').swap(this.get('game'), this.get('enemy'), 
			this.get('player').get('districts').rejectBy('name','university').rejectBy('name','dragongate').
			rejectBy('name', 'school').rejectBy('name','hospital').rejectBy('name','armory').sortBy('cost').get('lastObject'));
			this.get('game').get('currentCharacter').swap(this.get('game'), this.get('enemy'),
			this.get('enemy').get('districts').findBy('name','dragongate') || 
			this.get('enemy').get('districts').findBy('name','university') ||
			this.get('enemy').get('districts').findBy('name','school') ||
			this.get('enemy').get('districts').findBy('name','hospital'));
			if (this.get('game').get('currentCharacter').get('swapped')) return;
		}
		
		if (this.get('enemy').hasDistrict('armory'))
		{
			this.get('game').get('currentCharacter').swap(this.get('game'), this.get('enemy'),
			this.get('player').get('districts').sortBy('cost').objectAt(0)); 
			this.get('game').get('currentCharacter').swap(this.get('game'), this.get('enemy'),
		    this.get('enemy').get('districts').findBy('name','armory'));
			if (this.get('game').get('currentCharacter').get('swapped')) return;
		}
			
		var min_swap = false;

		if ((!this.get('player').get('has_crown') || !this.get('game').get('characters').get('content').findBy('name', 'Thief'))
		    && !this.endOfGame())
			min_swap = true;

		var player_districts = this.get('player').get('districts').sortBy('cost').rejectBy('color', 'purple').rejectBy('color', 'city');
		var enemy_districts = this.get('enemy').get('districts').rejectBy('name', 'keep').sortBy('cost');
		
		for (var i=0; i<player_districts.length; i++)
			for (var j=enemy_districts.length-1; j>=0; j--)
			{
				if (enemy_districts.objectAt(j).get('cost') > player_districts.objectAt(i).get('cost')
				&& (!min_swap || min_swap && (enemy_districts.objectAt(j).get('cost') == player_districts.objectAt(i).get('cost') + 1 )))
				{
					this.get('game').get('currentCharacter').swap(this.get('game'), this.get('enemy'), player_districts.objectAt(i));
					this.get('game').get('currentCharacter').swap(this.get('game'), this.get('enemy'), enemy_districts.objectAt(j));
				}
				if (this.get('game').get('currentCharacter').get('swapped')) return;
			}
	},
	coronationStrategy : function() {
		var that = this;
		if (this.hasAllDublicates())
			this.get('player').giveCardForCrown(this.get('game'));
		else this.get('player').giveCoinForCrown(this.get('game'));
	},
	graveyardStrategy : function() {
		var pay = true;
		var card_on_graveyard = this.get('game').get('deck').get('card_on_graveyard')
		this.get('player').get('cards').forEach(function(card) {
			if (card_on_graveyard.get('name') == card.get('name')) pay = false;
		});
		this.get('player').useGraveyard(this.get('game'), pay);
	},
	lighthouseStrategy : function() {
		var cards_in_deck = this.get('game').get('deck').get('content').filterBy('status', 'in_deck');
		var card_to_take = false;
		var that = this;
		if (this.get('game').get('currentCharacter').get('name') == 'Architect'
		&& this.get('player').get('coins') && this.get('player').get('coins') < 6) {
			var cards_to_take = cards_in_deck.filterBy('cost', this.get('player').get('coins'));
			if (cards_to_take.length) 
				cards_to_take.forEach(function(card) {
					if (!that.get('player').hasDistrict(card.get('name')))
						card_to_take = card;
				});
			}
		if (!card_to_take) {
			card_to_take = cards_in_deck.findBy('name', 'armory') ||
						   (function() {
						      var contenders = [];
						      ['workshop',
						       'lab',
						       'school',
						       'library',
						       'hospital',
						       'university',
						       'dragongate',
						       'city',
						       'park'].forEach(function(card) {
						        if (cards_in_deck.findBy('name', card)) contenders.pushObject(cards_in_deck.findBy('name', card))
						      });
						      return contenders.objectAt(Math.floor(Math.random() * contenders.length));
						   })();
		}
		
		this.get('player').useLighthouse();
		this.get('player').lighthouseTake(card_to_take);
	},
	armoryStrategy : function() {
		var district_to_explode = false;
		if (this.get('enemy').hasDistrict('dragongate') || this.get('enemy').hasDistrict('university'))
			district_to_explode = this.get('enemy').get('districts').findBy('name', 'dragongate') ||
			this.get('enemy').get('districts').findBy('name', 'university');
		else if (this.endOfGame() && !this.get('player').get('closed'))
			district_to_explode = this.get('enemy').get('districts').sortBy('cost').get('lastObject');
		else if (this.get('enemy').get('districts').filterBy('cost', 6).length)
			district_to_explode = this.get('enemy').get('districts').filterBy('cost', 6).get('firstObject');
		if (district_to_explode) {
			this.get('player').onExplode();
			this.get('player').explodeArmory(this.get('game'), district_to_explode);
		}
	},
	destroyArmoryStrategy : function() {
		if (!this.get('enemy').hasDistrict('armory')) return;
		if (this.get('game').get('currentCharacter').get('name')!='Warlord') return;
		if (['bewitched', 'assassinated'].indexOf(this.get('game').get('currentCharacter').get('state')) > -1) return;
		if (this.get('player').get('districts').filterBy('color', 'red').length > 1) this.get('game').get('currentCharacter').takeIncome();
		else if (this.get('player').get('coins') < 2) this.get('game').get('currentCharacter').takeCoins(this.get('game'));
		this.get('game').get('currentCharacter').destroy(this.get('game'), this.get('enemy'), this.get('enemy').get('districts').findBy('name', 'armory'));
	},
	checkWillUseAlchemist : function() {
		if (!this.get('game').get('characters').get('content').findBy('name', 'Alchemist')) return false;
		if (this.get('game').get('currentCharacter').get('number') > 5) return false;
		if (this.endOfGame()) return false;
		if (this.get('player').get('characters').filterBy('state', 'normal').findBy('name', 'Alchemist')) return true; 
		return false;	
	},
	specialBuildStrategy : function() {
	    if (this.hasAllDublicates()) return;
	    var user_cards = this.get('player').get('cards').sortBy('cost');
	    var that = this;
	    
	    user_cards.forEach(function(card) {
	    	if (that.get('player').hasDistrict(card.get('name')) > that.get('player').hasDistrict('quarry'))
	    		user_cards = user_cards.rejectBy('name', card.get('name'));
	    });
	    
	    if (user_cards.length > 1 || (user_cards.length == 1 && this.get('player').get('coins') < user_cards.objectAt(0).get('cost') + 4)) 
	    {
			var coins_can_pay = this.get('player').get('coins') + 2 - user_cards.objectAt(user_cards.length - 1).get('cost');
			var built = false;
			for (var j=user_cards.length-2; j>=0; j--)
				if (!built && user_cards.objectAt(j).get('cost') <= coins_can_pay)
				{
					this.get('game').get('currentCharacter').build(this.get('game'), user_cards.objectAt(j));
					built = true;
				}
		}
		
	    if (this.get('game').get('currentCharacter').get('isColor')) this.get('game').get('currentCharacter').takeIncome();	  
	},
	/* refactoring strategy functions */
	action: function() {
		this.characterAction();
		this.incomeAction();
		this.coinsOrCard();
		this.characterAction();
		this.build();
		this.incomeAction();
		this.characterAction();
	},
	characterAction: function() {
	
	},
	incomeAction: function() {
	
	},
	coinsOrCard: function() {
	
	},
	build: function() {
	
	}
});

var player1_strategy, player2_strategy;
