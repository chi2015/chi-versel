var app = new Vue({
  el: '#app',
  data: {
    playersCnt : 11,
    m : 3,
    players : [],
    contras : [],
    checking : "blue",
    checkingCases: ["red", "black", "blue", "grey"],
    pSelect : [],
    mSelect : [2,3,4]
  },
  created: function() {
    this.initData();
  },
  computed: {
    combinations: function() {
      function k_combinations(set, k) {
	var i, j, combs, head, tailcombs;
	
	// There is no way to take e.g. sets of 5 elements from
	// a set of 4.
	if (k > set.length || k <= 0) {
		return [];
	}
	
	// K-sized set has only one K-sized subset.
	if (k == set.length) {
		return [set];
	}
	
	// There is N 1-sized subsets in a N-sized set.
	if (k == 1) {
		combs = [];
		for (i = 0; i < set.length; i++) {
			combs.push([set[i]]);
		}
		return combs;
	}
	
	// Assert {1 < k < set.length}
	
	// Algorithm description:
	// To get k-combinations of a set, we want to join each element
	// with all (k-1)-combinations of the other elements. The set of
	// these k-sized sets would be the desired result. However, as we
	// represent sets with lists, we need to take duplicates into
	// account. To avoid producing duplicates and also unnecessary
	// computing, we use the following approach: each element i
	// divides the list into three: the preceding elements, the
	// current element i, and the subsequent elements. For the first
	// element, the list of preceding elements is empty. For element i,
	// we compute the (k-1)-computations of the subsequent elements,
	// join each with the element i, and store the joined to the set of
	// computed k-combinations. We do not need to take the preceding
	// elements into account, because they have already been the i:th
	// element so they are already computed and stored. When the length
	// of the subsequent list drops below (k-1), we cannot find any
	// (k-1)-combs, hence the upper limit for the iteration:
	combs = [];
	for (i = 0; i < set.length - k + 1; i++) {
		// head is a list that includes only our current element.
		head = set.slice(i, i + 1);
		// We take smaller combinations from the subsequent elements
		tailcombs = k_combinations(set.slice(i + 1), k - 1);
		// For each (k-1)-combination we join it with the current
		// and store it to the set of k-combinations.
		for (j = 0; j < tailcombs.length; j++) {
			combs.push(head.concat(tailcombs[j]));
		}
	}
	return combs;
}
      var nums = [], black_cnt = 0;
      this.players.forEach(function(player) {
        nums.push(player.num);
        if(player.color == "black") black_cnt++;
      });
      return k_combinations(nums, this.m).filter(
        function(comb) {
          var comb_black_cnt = 0;
          var ret = true;
          comb.forEach(function(num) { 
            if (black_cnt && this.getPlayer(num).color == "black") { comb_black_cnt++; }
            if (this.getPlayer(num).color == "red") ret = false;
          }.bind(this));
          if (ret && comb_black_cnt!=black_cnt) ret = false;
          if (ret)
          this.contras.forEach(function(contra) {
            if (~comb.indexOf(contra[0]) && ~comb.indexOf(contra[1])) ret = false;
          });
          return ret;
        }.bind(this));
    }
  },
  methods: {
    initData : function() {
      this.resetPlayers();
      for (var j=8; j<=16; j++)
        this.pSelect.push(j);
      var isOnIOS = navigator.userAgent.match(/iPad/i)|| navigator.userAgent.match(/iPhone/i);
	  var eventName = isOnIOS ? "pagehide" : "beforeunload";
      window.addEventListener(eventName, (e) => {
        localStorage.setItem("saved", 1);
        localStorage.setItem("playersCnt", this.playersCnt);
        localStorage.setItem("m", this.m);
        localStorage.setItem("players", JSON.stringify(this.players));
        localStorage.setItem("contras", JSON.stringify(this.contras));
      }, false);
      if (localStorage.getItem("saved")) {
        this.playersCnt = +localStorage.getItem("playersCnt");
        this.m = +localStorage.getItem("m");
        if (localStorage.getItem("players"))
        this.players = JSON.parse(localStorage.getItem("players"));
        if (localStorage.getItem("contras"))
          this.contras = JSON.parse(localStorage.getItem("contras"));
      
      }
    },
    resetPlayers : function() {
      for (var i=0; i< this.playersCnt; i++)
        Vue.set(this.players, i, {num: i+1, color: "grey"});
    },
    reset : function() {
      this.resetPlayers();
      this.playersCnt = 11;
      this.changePlayersCnt();
      this.contras = [];
      this.checking = "blue";
      window.scrollTo(0, 0);
    },
    switchChecking: function() {
      var i = this.checkingCases.indexOf(this.checking),
          l = this.checkingCases.length;
      this.checking = i == l - 1 ? this.checkingCases[0] : this.checkingCases[i+1];
      if (this.checking !== "blue") this.removeBluePlayers();
    },
    setPlayerColor : function(i) {
      var player = this.players[i];
     
      if (this.checking == "blue" && player.color!="grey")       {
        alert("You can contra only grey players!"); 
        return;
      }
      player.color = this.checking;
      Vue.set(this.players, i, player);
      var blue_players = this.players.filter(function(player) {
        return player.color == "blue";
      });
      if (blue_players.length == 2) {
        setTimeout(function() {this.setContra(blue_players);
                              this.removeBluePlayers();}.bind(this), 100);
        
      }
    },
    getPlayer(num) {
      var ret = { color: "grey"};
      this.players.forEach(function(player) {
        if (player.num == num) ret = player;
      });
      return ret;
    },
    setContra(players) {
      var contra_arr = [];
      players.forEach(function(player) {
        contra_arr.push(player.num);
      }.bind(this));
      this.contras.push(contra_arr);
      alert("Contra: "+contra_arr.join(" "));
    },
    removeBluePlayers : function() {
      this.players.forEach(function(player, i) {
        if (player.color == "blue") {
          player.color = "grey";
          Vue.set(this.players, i, player);
        }
      }.bind(this));
    },
    changePlayersCnt : function() { 
      this.modifyPlayers();
      this.checkMCnt();
    },
    checkMCnt : function() {
      switch (this.playersCnt) {
        case 8:
        case 9: this.m = 2; break;
        case 10: 
        case 11:
        case 12:
        case 13: this.m = 3; break;
        case 14:
        case 15:
        case 16: this.m = 4; break;
      }
    },
    modifyPlayers : function() {
      if (this.playersCnt < this.players.length)
        this.players = this.players.slice(0, this.playersCnt);
      else
        for (var i= this.players.length; i< this.playersCnt; i++) this.players.push({num : i + 1, color: "grey"});
    }
  }
});
