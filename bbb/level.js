'use strict';

Crafty.scene("Level", function() {
	 var level = 0;
	 var checkpoint = 1;
	 var balls_cnt, balls_init = 0;
	 var level_state = "init";
	 var bricks_total_strength = 0, old_bts = -1;
	 var p, down_btn, forward_btn;
	 var prepend_infinity_interval = null;
	 var appear_buttons_timeout = null;
	 var playSounds = true;
	 var oldMousePos = {};
	 
	 Crafty.e("Global");
	 Crafty.e("Roof");
	 var floor = Crafty.e("Floor");
	 Crafty.e("LeftWall");
	 Crafty.e("RightWall");
	 var pause_btn = Crafty.e("2D, Canvas, pause_btn, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 4,
	  										  y : Crafty("Global").get(0).basicSize * 2,
	  										  w : Crafty("Global").get(0).basicSize * 12,
	  										  h : Crafty("Global").get(0).basicSize * 12}).bind("Click", function() {
	  									  	if (game_over || Crafty.isPaused()) return;
	  									  	if (!Crafty.isPaused()) Crafty.e("Background").setTitle("GAME PAUSED")
	  									  	.addButton("resume_btn", 
										function() { Crafty.pause(); Crafty("Background").get(0).destroy(); Crafty.trigger("PlaySound", "pause"); }, 
										floor.w / 2 - Crafty("Global").get(0).basicSize * 9, 
										Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 55);
	  									  	else if (Crafty("Background").get(0)) Crafty("Background").get(0).destroy();
	  									  	setTimeout(function() { Crafty.trigger("PlaySound", "pause"); Crafty.pause(); }, 50);
	  									  }.bind(this));
	 var sound_btn = Crafty.e("2D, Canvas, soundon_btn, SpriteAnimation, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 74,
		                                                                                y : Crafty("Global").get(0).basicSize * 2,
																						w : Crafty("Global").get(0).basicSize * 12,
																						h : Crafty("Global").get(0).basicSize * 12})
																				.reel("switchoff", 100, [[2, 2], [1, 2]])
																				.reel("switchon", 100, [[1, 2], [2, 2]])
										                                        .bind("Click", function() {
																					
																					if (playSounds) sound_btn.animate("switchoff");
																					else sound_btn.animate("switchon");
																					playSounds = !playSounds;
																				}.bind(this));
		 
	 
	 var places = [0,1,2,3,4,5,6];
	 var bricks_cnt;
	 var moving_balls = 0;
	 var next_place_defined = false;
	 var next_place = {};
	 var mouse_clicked = false;
	 var game_over = false;
	 
	 var level_text = Crafty.e("2D, DOM, Text").attr({ x: 0, y : Crafty("Global").get(0).basicSize * 4, w : Crafty.viewport.width})
    .text(function () { return "Level&nbsp;"+level; }).textFont({ size: (Crafty("Global").get(0).basicSize * 8)+'px', weight: 'bold' }).textAlign('center')
    .dynamicTextGeneration(true);
     var balls_cnt_text = Crafty.e("2D, DOM, Text").attr({ y : floor.y + Crafty("Global").get(0).basicSize * 2})
    .text(function () { return balls_init > 0 ? "x"+balls_init : ""; })
    .textFont({ size: (Crafty("Global").get(0).ballSize * 1.5)+'px'})
    .dynamicTextGeneration(true);
    
     
    
     var SAVE_KEY = "chi247_bbb_save_v1";

     // Autosave is best-effort: any storage failure (private mode, quota,
     // disabled storage) is swallowed so it never interrupts play.
     function saveState() {
         try {
             var bricks = [];
             Crafty("Brick").each(function() {
                 bricks.push({ col: this.col, strength: this.strength, rowsDown: this.rowsDown });
             });
             var extraBalls = [];
             Crafty("ExtraBall").each(function() {
                 extraBalls.push({ col: this.col, rowsDown: this.rowsDown });
             });
             var state = {
                 v: 1,
                 level: level,
                 checkpoint: checkpoint,
                 balls_cnt: balls_cnt,
                 bricks: bricks,
                 extraBalls: extraBalls
             };
             localStorage.setItem(SAVE_KEY, JSON.stringify(state));
         } catch (e) { /* ignore */ }
     }

     function clearSavedState() {
         try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
     }

     function loadSavedState() {
         try {
             var raw = localStorage.getItem(SAVE_KEY);
             if (!raw) return null;
             var state = JSON.parse(raw);
             if (!state || state.v !== 1 || !Array.isArray(state.bricks) || typeof state.level !== "number") return null;
             return state;
         } catch (e) { return null; }
     }

     // Rebuilds the exact saved round: same level/checkpoint/ball count and
     // the same bricks (column, strength, rows fallen) placed instantly with
     // no tween, instead of NextLevel's normal random spawn.
     function restoreState(state) {
         Crafty("Ball").each(function() { this.destroy(); });
         Crafty("Brick").each(function() { this.destroy(); });
         Crafty("ExtraBall").each(function() { this.destroy(); });

         level = state.level;
         checkpoint = state.checkpoint || 1;
         moving_balls = 0;
         balls_cnt = Math.max(1, state.balls_cnt || 1);
         level_state = "init";
         bricks_total_strength = 0;
         old_bts = 0;
         game_over = false;

         for (var i = 0; i < balls_cnt; i++)
             Crafty.e("Ball").place(floor.w / 2 - Crafty("Global").get(0).ballSize / 2, floor.y - Crafty("Global").get(0).ballSize);
         next_place = { x: Crafty("Ball").get(0).x, y: Crafty("Ball").get(0).y };

         state.bricks.forEach(function(b) {
             Crafty.e("Brick").initLevel(b.strength).place(b.col).skipDown(b.rowsDown || 0);
         });
         (state.extraBalls || []).forEach(function(eb) {
             Crafty.e("ExtraBall").place(eb.col).skipDown(eb.rowsDown || 0);
         });

         balls_init = balls_cnt;
         var labelW = Crafty("Global").get(0).basicSize * 14;
         balls_cnt_text.w = labelW;
         balls_cnt_text.x = Math.min(next_place.x + Crafty("Global").get(0).basicSize, Crafty.viewport.width - labelW);
     }

     function resetVars(r) {
		 Crafty("Ball").each(function() { this.destroy(); });
		 Crafty("Brick").each(function() { this.destroy(); });
		 Crafty("ExtraBall").each(function() { this.destroy(); });
		 
		 level = r - 1;
		 moving_balls = 0;
		 balls_cnt = r;
		 level_state = "init";
		 bricks_total_strength = 0; 
		 old_bts = 0;
		 game_over = false;
		 
		 for (var i=0; i<balls_cnt; i++)
			 Crafty.e("Ball").place(floor.w / 2 - Crafty("Global").get(0).ballSize / 2, floor.y - Crafty("Global").get(0).ballSize);
		 next_place = {x : Crafty("Ball").get(0).x, y : Crafty("Ball").get(0).y };
	 }
	 
	 Crafty.bind("PlaySound", function(sound) {
		 if (!playSounds) return;
		 if (WebAudioSounds && WebAudioSounds.play(sound)) return;
		 Crafty.audio.play(sound);
	 });
	 	 
	 Crafty.bind("NextLevel", function() {
		level++;
		
		
		Crafty("Brick").each(function() {
			this.down();
		});
		
		Crafty("ExtraBall").each(function() {
			this.down();
		});

		
		p = 1 / (6 - Math.floor(level/200));
		bricks_cnt = Math.random() >= p ? Crafty.math.randomInt(1, 5) : 6;
		places.sort(function() { return Math.random() - 0.5 });
		var strength = level % 5 ? level : 2*level;
		if (level % 5 == 0) bricks_cnt = bricks_cnt / 2;
		var spawnDelay = Crafty.e("Delay");
		spawnDelay.delay(function() {
		for (var i=0; i<7; i++) {
			if (places.slice(0, Math.floor(bricks_cnt)).indexOf(i)!==-1) Crafty.e("Brick").initLevel(strength).place(i);
			if (bricks_cnt > Math.floor(bricks_cnt) && i == places[Math.floor(bricks_cnt)]) Crafty.e("Brick").initLevel(level).place(i);
			if (i == places[Math.floor(bricks_cnt) + (bricks_cnt > Math.floor(bricks_cnt))]) Crafty.e("ExtraBall").place(i);
		}

		if (!game_over) { level_state = "init"; saveState(); }
		spawnDelay.destroy();

		}, Crafty("Global").get(0).tweenDuration);

		if (Crafty("Ball").length < balls_cnt) {
			var len = Crafty("Ball").length;
			for (var j=0; j< balls_cnt - len; j++) 
				Crafty.e("Ball").place(next_place.x, next_place.y);
		}
		
		balls_init = balls_cnt;
		var labelW = Crafty("Global").get(0).basicSize * 14;
		balls_cnt_text.w = labelW;
		balls_cnt_text.x = Math.min(next_place.x + Crafty("Global").get(0).basicSize, Crafty.viewport.width - labelW);
		
		next_place_defined = false;
		next_place = {};
		
		clearInterval(prepend_infinity_interval);
		clearTimeout(appear_buttons_timeout);
	 });
	 
	 Crafty.bind("AddBall", function() {
		 balls_cnt++;
	 });
	 
	 Crafty.bind("BallStop", function() {
		moving_balls--;
		if (moving_balls == 0) {
			level_state = "stop";
			destroyButtons();
			if (!game_over) Crafty.trigger("NextLevel");
		}
	 });
	 
	 Crafty.bind("NextPlace", function(ball) {
		 if (!next_place_defined) {
			 ball.y = Crafty("Floor").get(0).y - ball.h;
			 next_place.x = ball.x;
			 next_place.y = ball.y;
			 next_place_defined = true;
		 }
		 else {
			 ball.y = next_place.y;
			 ball.tween({x : next_place.x}, Crafty("Global").get(0).tweenDuration );
		 }
	 });
	 
	 Crafty.bind("GameOver", function() {
		 if (!game_over) {
			 Crafty.e("Background")
				   .setTitle("GAME OVER")
				   .addButton("restart_btn", 
							  function() { resetGame(checkpoint); Crafty("Background").get(0).destroy(); }, 
							  floor.w / 2 - Crafty("Global").get(0).basicSize * 9,
							  Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 55);
			 game_over = true;
			 clearSavedState(); // don't let a refresh after death resurrect the lost round
			 Crafty.trigger("PlaySound", "over");
		}
	 });
	 
	 Crafty.bind("Clear", function() {
	 	var clear_text = Crafty.e("2D, DOM, Text").attr({ x: 0, y : Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 40, w : Crafty.viewport.width})
    	.text("CLEAR!").textFont({ size: (Crafty("Global").get(0).basicSize * 10)+'px', weight: 'bold' }).textAlign('center');
    	setTimeout(function() { clear_text.destroy(); }, 1000);
    	checkpoint = level;
    	Crafty.trigger("PlaySound", "clear");
	 });
	 
	 Crafty.bind("AddBrickStrength", function(s) {
	 	bricks_total_strength += s;
	 });
	 
	 Crafty.bind("RemoveBrickStrength", function() {
	 	bricks_total_strength--;
	 	if (bricks_total_strength <= 0) Crafty.trigger("Clear");
	 });
	 	 
	 var startMoving = function(direction) {
			if (level_state!="init") return;
			prepend_infinity_interval = setInterval(prependInfinity, 5000);
			appear_buttons_timeout = setTimeout(appearButtons, 10000);
			
			var i=0, ballTimers = [];
			
			function moveBalls() {
				if (i>1) clearTimeout(ballTimers[i-2]);
				Crafty("Ball").get(i).direction = direction;
				Crafty("Ball").get(i).moving();
				moving_balls++;
				balls_init--;
				i++;
				if (i<Crafty("Ball").length) ballTimers[i-1] = setTimeout(moveBalls, 100);
			}
			
			moveBalls();
			level_state = "moving";
	 };
	 
	 var oldMousePos = {};
	 
	 function stageMouseDown(e) {
	 	if (e.isTrusted === false) return; // ignore Crafty mimicMouse synthetic events
	 	if (!mouse_clicked && !Crafty.isPaused() && level_state == "init" && !pause_btn.isAt(e.realX, e.realY) && !sound_btn.isAt(e.realX, e.realY))
		 {
			 Crafty.e("Direction");
			 mouse_clicked = true;
			 oldMousePos = {x : e.realX, y : e.realY};
		 }
	 }

	 function stageMouseMove(e) {
	 	if (e.isTrusted === false) return; // ignore Crafty mimicMouse synthetic events
	 	 if (mouse_clicked) {
			 var movementX = e.realX - oldMousePos.x, movementY = e.realY - oldMousePos.y;
			 var rotation = Crafty("Direction").get(0).getRotation();
			 rotation += -Math.sign(movementX);
			 rotation += Math.sign(movementY)*Math.sign(270-rotation);
			 if (rotation <= 180 || rotation >=360) cancelDirection();
			 else Crafty("Direction").get(0).setRotation(rotation);
			 oldMousePos = {x : e.realX, y : e.realY};
		}
	 }

	 function stageMouseUp(e) {
	 	if (e.isTrusted === false) return; // ignore Crafty mimicMouse synthetic events
	 	if (mouse_clicked) {
		 var direction = Crafty("Direction").get(0).getRotation() - 180;
		 Crafty("Direction").each(function() { this.destroy(); });
		 mouse_clicked = false;
		 startMoving(direction);
		}
	 }

	 function cancelDirection() {
		 Crafty("Direction").each(function() { this.destroy(); });
		 mouse_clicked = false;
	 }

	 function getTouchPos(e) {
	 	var t = e.touches[0] || e.changedTouches[0];
	 	var rect = Crafty.stage.elem.getBoundingClientRect();
	 	return { realX: t.clientX - rect.left, realY: t.clientY - rect.top };
	 }

	 Crafty.addEvent(this, Crafty.stage.elem, "mousedown", stageMouseDown);
	 Crafty.addEvent(this, Crafty.stage.elem, "mousemove", stageMouseMove);
	 Crafty.addEvent(this, Crafty.stage.elem, "mouseup", stageMouseUp);
	 Crafty.addEvent(this, Crafty.stage.elem, "mouseout", cancelDirection);

	 Crafty.addEvent(this, Crafty.stage.elem, "touchstart", function(e) {
	 	var pos = getTouchPos(e);
	 	if (pause_btn.isAt(pos.realX, pos.realY)) { pause_btn.trigger("Click"); return; }
	 	if (sound_btn.isAt(pos.realX, pos.realY)) { sound_btn.trigger("Click"); return; }
	 	if (down_btn && down_btn.isAt(pos.realX, pos.realY)) { down_btn.trigger("Click"); return; }
	 	if (forward_btn && forward_btn.isAt(pos.realX, pos.realY)) { forward_btn.trigger("MouseDown"); return; }
	 	var bg = Crafty("Background").get(0);
	 	if (bg) {
	 		for (var i = 0; i < bg.buttons.length; i++) {
	 			if (bg.buttons[i].isAt(pos.realX, pos.realY)) { bg.buttons[i].trigger("Click"); return; }
	 		}
	 	}
	 	stageMouseDown(pos);
	 });

	 Crafty.addEvent(this, Crafty.stage.elem, "touchmove", function(e) {
	 	e.preventDefault();
	 	stageMouseMove(getTouchPos(e));
	 });

	 Crafty.addEvent(this, Crafty.stage.elem, "touchend", function(e) {
	 	var pos = getTouchPos(e);
	 	if (forward_btn && forward_btn.isAt(pos.realX, pos.realY)) { forward_btn.trigger("MouseUp"); return; }
	 	stageMouseUp(pos);
	 });

	 Crafty.addEvent(this, Crafty.stage.elem, "touchcancel", cancelDirection);
	 
	 function resetGame(r) {
		resetVars(r);
		Crafty.trigger("PlaySound", "start");
		Crafty.trigger("NextLevel");
	 }

	 // Cheat codes: "GOTO<n>" jumps straight to level n (2-400) instead of
	 // starting at level 1. Also sets the checkpoint to n, so dying there
	 // still resumes at n rather than falling all the way back to level 1.
	 var CHEAT_PATTERN = /^GOTO(\d{1,3})$/i;
	 var CHEAT_MIN_LEVEL = 2, CHEAT_MAX_LEVEL = 400;

	 function showStartScreen() {
		 var g = Crafty("Global").get(0);
		 var roofY = Crafty("Roof").get(0).y;
		 var bg = Crafty.e("Background").setTitle("BALLS BREAK BRICKS");
		 // Background's default title size (basicSize*10) is sized for a
		 // short word like "GAME OVER" — this longer name wraps to two
		 // lines at that size and overlaps the controls below it.
		 bg.title.textFont({ size: (g.basicSize * 6) + 'px', weight: 'bold' });

		 var input = document.createElement("input");
		 input.type = "text";
		 input.placeholder = "CHEAT CODE";
		 input.autocomplete = "off";
		 input.autocapitalize = "characters";
		 input.spellcheck = false;
		 input.maxLength = 10;
		 input.style.position = "absolute";
		 input.style.left = (Crafty.viewport.width / 2 - g.basicSize * 22) + "px";
		 input.style.top = (roofY + g.basicSize * 56) + "px";
		 input.style.width = (g.basicSize * 44) + "px";
		 input.style.height = (g.basicSize * 10) + "px";
		 input.style.fontSize = (g.basicSize * 5) + "px";
		 input.style.textAlign = "center";
		 input.style.textTransform = "uppercase";
		 // Crafty's own DOM layer (which the Background overlay/title live in)
		 // renders at z-index 30 and the canvas layer at 20, both as direct
		 // siblings of this element under Crafty.stage.elem — a low z-index
		 // here sits *underneath* them and never receives clicks/taps.
		 input.style.zIndex = 1000;
		 input.style.boxSizing = "border-box";
		 input.style.border = "2px solid #ffffff";
		 input.style.borderRadius = "4px";
		 input.style.background = "#222222";
		 input.style.color = "#ffe066";
		 Crafty.stage.elem.appendChild(input);

		 // Makes clear the code is optional — PLAY with it left blank just
		 // starts a normal game.
		 var hint = Crafty.e("2D, DOM, Text").attr({
			 x: 0, y: roofY + g.basicSize * 67, z: 3, w: Crafty.viewport.width,
		 }).textAlign('center').textColor('#ffffffaa')
		   .textFont({ size: (g.basicSize * 3.4) + 'px' })
		   .text('(optional - leave blank to play normally)');

		 // Pause the engine while the start screen is up: nothing has been
		 // placed yet (no balls/bricks), so a stray tap on the background
		 // would otherwise reach stageMouseDown's aiming logic and crash on
		 // a missing ball.
		 Crafty.pause(true);

		 // Returns false (and does nothing) on a second call — guards against
		 // the same tap being dispatched twice on touch devices (see the
		 // matching comment on pause_btn above).
		 var finished = false;
		 function cleanup() {
			 if (finished) return false;
			 finished = true;
			 if (input.parentNode) input.parentNode.removeChild(input);
			 hint.destroy();
			 bg.destroy();
			 Crafty.pause(false);
			 return true;
		 }

		 function applyCheatOrStart() {
			 var raw = input.value.trim();
			 if (!raw) { if (cleanup()) resetGame(1); return; }
			 var m = CHEAT_PATTERN.exec(raw);
			 var n = m && parseInt(m[1], 10);
			 if (n >= CHEAT_MIN_LEVEL && n <= CHEAT_MAX_LEVEL) {
				 if (cleanup()) { checkpoint = n; resetGame(n); }
			 } else {
				 input.value = "";
				 input.placeholder = "INVALID CODE";
				 setTimeout(function() { input.placeholder = "CHEAT CODE"; }, 1200);
			 }
		 }

		 input.addEventListener("keydown", function(e) {
			 if (e.key === "Enter") { e.preventDefault(); applyCheatOrStart(); }
		 });

		 bg.addButton("play_btn", function() { if (cleanup()) resetGame(1); },
					  floor.w / 2 - g.basicSize * 9, roofY + g.basicSize * 74);
	 }

	 var savedState = loadSavedState();
	 if (savedState) {
		 restoreState(savedState);
	 } else {
		 showStartScreen();
	 }
	
	 function prependInfinity() {
	 	if (balls_init == 0 && moving_balls > 0 && old_bts == bricks_total_strength) {
	 	Crafty("Ball").each(function() {
	 		if (this.state == "moving") {
				if (!next_place_defined) this.x = floor.w / 2 - Crafty("Global").get(0).ballSize / 2;
				this.stop();
			}
	 	});
		
		clearInterval(prepend_infinity_interval);
		prepend_infinity_interval = null;
		
		}
	 	
	 	old_bts = bricks_total_strength;
	 }
	 
	 function appearButtons() {
		 down_btn = Crafty.e("2D, Canvas, down_btn, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 4,
	  										  y : Crafty("Floor").get(0).y + Crafty("Global").get(0).basicSize * 3,
	  										  w : Crafty("Global").get(0).basicSize * 10,
	  										  h : Crafty("Global").get(0).basicSize * 10}).bind("Click", function() {
	  										  	Crafty("Ball").each(function() {
													if (this.state == "moving") {
														if (!next_place_defined) this.x = floor.w / 2 - Crafty("Global").get(0).ballSize / 2;
														this.stop();
													}
												});
	  										  });
	 
		 
		 forward_btn = Crafty.e("2D, Canvas, forward_btn, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 74,
	  										  y : Crafty("Floor").get(0).y + Crafty("Global").get(0).basicSize * 3,
	  										  w : Crafty("Global").get(0).basicSize * 10,
	  										  h : Crafty("Global").get(0).basicSize * 10}).bind("MouseDown", function() {
	  										  	Crafty("Ball").each(function() {
														this.faster();
												});
	  										  })
	  										  .bind("MouseUp", function() {
	  										  	Crafty("Ball").each(function() {
														this.slower();
												});
	  										  });
	 }
	 
	 function destroyButtons() {
		 if (down_btn) { down_btn.destroy(); down_btn = false; }
		 if (forward_btn) { forward_btn.destroy(); forward_btn = false; }
	 }	 
});
