'use strict';

var WebAudioSounds = (function() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    var ctx;
    try { ctx = new AudioCtx(); } catch(e) { return null; }

    var buffers = {};
    var names = ["start", "pause", "kick", "bubble", "pick", "over", "clear"];

    names.forEach(function(name) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "sounds/" + name + ".mp3", true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function() {
            if (!xhr.response) return;
            // Use callback form — older iOS Safari does not return a Promise from decodeAudioData
            ctx.decodeAudioData(xhr.response, function(buf) {
                buffers[name] = buf;
            }, function() {});
        };
        xhr.send();
    });

    // Mobile browsers (iOS Safari especially) auto-suspend an idle AudioContext
    // during normal gameplay gaps. resume() only resolves quickly when called
    // synchronously from inside a trusted user-gesture handler — calling it from
    // game/physics code (e.g. a collision callback) makes iOS deprioritize the
    // resume for 1-3s, and any source already start()-ed just sits buffered until
    // resume actually completes. So keep the context alive continuously from every
    // real gesture instead of resuming reactively when a sound needs to play.
    function keepAlive() {
        if (ctx.state !== "running") ctx.resume();
    }
    ["touchstart", "touchend", "mousedown", "mouseup"].forEach(function(type) {
        document.addEventListener(type, keepAlive, { capture: true });
    });
    document.addEventListener("visibilitychange", function() {
        if (!document.hidden) keepAlive();
    });

    return {
        play: function(name) {
            var buf = buffers[name];
            if (!buf || ctx.state !== "running") return false;
            try {
                var src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start(0);
                return true;
            } catch(e) { return false; }
        }
    };
})();

var assetsObj = {
    "sprites": {
        "ball.png": {
            tile: 16,
            tileh: 16,
            map: {
                ball_sprite: [0, 0]
            }
        },
        "buttons.png": {
        	tile: 266,
        	tileh : 266,
        	map : {
        		down_btn : [0, 0],
				forward_btn : [1, 0],
				pause_btn : [2, 0],
				play_btn : [0, 1],
				quit_btn : [1, 1],
        		restart_btn : [2, 1],
        		resume_btn : [0, 2],
        		soundoff_btn : [1, 2],
        		soundon_btn : [2, 2]
        	}
        }
    },
    "audio": {
		"start" : "sounds/start.mp3",
		"pause" : "sounds/pause.mp3",
		"kick"  : "sounds/kick.mp3",
		"bubble" : "sounds/bubble.mp3",
		"pick" : "sounds/pick.mp3",
		"over" : "sounds/over.mp3",
		"clear" : "sounds/clear.mp3"
	}
};

function getViewportSize() {
	var winWidth = window.innerWidth, winHeight = window.innerHeight,
	gameBlockWidth, gameBlockHeight;
	
	if (winHeight > winWidth) {
		gameBlockWidth = Math.floor(winWidth/90) * 90;
		gameBlockHeight = gameBlockWidth * 150 / 90;
	}
	else {
		gameBlockHeight = Math.floor(winHeight/150) * 150;
		gameBlockWidth = gameBlockHeight * 90 /150;
	}
	
	return {width: gameBlockWidth, height: gameBlockHeight};
}

var viewportSize = getViewportSize();

window.onload = function() {

	Crafty.init(viewportSize.width, viewportSize.height);
	
	Crafty.c("Global", {
		init : function() {
			this.basicSize = Crafty.viewport.width / 90;
			this.gapSize = this.basicSize;
			this.brickSize = this.basicSize * 12;
			this.roofY = 16 * this.gapSize;
			this.brickWithGap = this.gapSize + this.brickSize;
			this.floorY = 134 * this.gapSize;
			this.ballSize = this.basicSize * 4;
			this.basicSpeed = Crafty.viewport.width * 1.5;
			this.chromaRange = chroma.scale(['red','#ff9933','#ffcc00','#99cc00','#66ffff','#0066ff','#9933ff']);
			this.tweenDuration = 100;
		}
	});
	
	Crafty.load(assetsObj, function() { /*Crafty.scene("Level");*/ });
	Crafty.scene("Level");

	window.addEventListener("resize", function() {
	/*	var newHeight = getViewportSize().height;

		if (newHeight!=viewportSize.height && newHeight >= 180) {
			var sc = newHeight / viewportSize.height;
			var gameBlockEl = document.getElementById('cr-stage');
			viewportSize = getViewportSize();
			console.log('scale', sc);
			gameBlockEl.style.height = viewportSize.height +'px';
			gameBlockEl.style.width = viewportSize.width+'px';
			Crafty.viewport.scale(sc);
			Crafty.viewport.reset();
			Crafty.viewport.reload();
			
		}*/
	});
};

