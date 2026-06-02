const countries = {
	'gb':'UK',
	'us':'USA',
	'au':'Australia',
	'ca':'Canada',
	'nz':'New Zealand',
	'ie':'Ireland',
	'ru':'Russia'
}

var top100Data = [];
var currentPlayingNum = null;
var stickyObserver = null;

const parseResponse = res => {
	let ret_str = 'Error connecting iTunes Feed';
	console.log('response', res);
	resetStickyPlayer();
	top100Data = [];
	if (res.feed && res.feed.entry)
	{
		const top100 = res.feed.entry;
		ret_str = '<table><tr><th>No</th><th></th><th>Artist - Song</th><th>Release date</th><th></th></tr>';
		for (var i=0; i<top100.length; i++)
		{
			var n = i+1;
			var images = top100[i]['im:image'];
			var art = images && images.length ? images[images.length - 1].label : '';
			top100Data[i] = {
				artist: top100[i]['im:artist']['label'],
				title: top100[i]['im:name']['label'],
				art: art
			};
			ret_str += '<tr data-track="' + i + '"><td>'
			+ n.toString() + '</td><td>'
			+ (top100[i]['link'] && top100[i]['link'][1] && top100[i]['link'][1]['attributes'] ? '<div onclick="previewTrack('+i+');" class="itunes-player play" id="player-'+i+'">'+
			'<audio class="itunes-audio" id="audio-'+i+'"'
			+' preload="metadata"'
			+' type="'+top100[i]['link'][1]['attributes']['type']+'"'
			+' src="'+top100[i]['link'][1]['attributes']['href']+'"/>'
			+'</div>' : '') + '</td><td>'
			+top100[i]['im:artist']['label'] + ' - '
			+ top100[i]['im:name']['label'] + '</td><td class="release-date">'
			+ (top100[i]['im:releaseDate'] && top100[i]['im:releaseDate']['attributes']['label'] || '') +
			'</td><td><a title="Download in iTunes" href="'
			+top100[i]['id']['label']+'" class="dl_link"><img src="/itunes100/download.jpg"/></a></td></tr>';
		}

		ret_str += '</table>';
	}

	list.innerHTML = ret_str;

	let audios = document.getElementsByClassName('itunes-audio');
	for (var j=0; j<audios.length; j++) {
		audios[j].ontimeupdate = e => {
			const track = e.target;
			const num = getTrackNum(track);
			const next = num === audios.length - 1 ? 0 : num + 1;
			if (track.duration - track.currentTime <= 1 && audios[next].paused) {
				previewTrack(next);
			}
		}
	}
}

const loadList = country =>
{
	if (!country)
	{
			list.innerHTML = "";
			return;
	}

	list.innerHTML = '<p class="load">Loading...</p>';
	if (document.getElementById("apple_script")) apple_script.remove();
	let as_el = document.createElement("script");
	as_el.id = "apple_script";
	as_el.type = "text/javascript";
	as_el.src = "https://itunes.apple.com/"+country+"/rss/topsongs/limit=100/explicit=true/json?callback=parseResponse";
	document.head.appendChild(as_el);
}

const initSelectCountry = () => {
	let choose_el = document.getElementById('choose');
	choose_el.innerHTML = '<option value="">Choose...</option>';
	for (let key in countries) {
		choose_el.innerHTML += '<option value="'+key+'">'+countries[key]+'</option>';
	}
}

const previewTrack = num => {
	let el = document.getElementById('player-'+num), track = document.getElementById('audio-'+num),
	audios = document.getElementsByClassName('itunes-audio');
	for (let j=0; j<audios.length; j++)
		if (j != num && !audios[j].paused) {
			fadeAudio(audios[j]);
		}
	if (el.className == "itunes-player play") {
	    if (!track.paused) resetFadeAudio(track);
	    el.className = "itunes-player pause";
	    track.play();
	    setActiveTrack(num, true);
	  }
	  else
	  if (el.className == "itunes-player pause") {
	  	if (!track.paused) track.pause();
	  	el.className = "itunes-player play";
	  	setActiveTrack(num, false);
	  } else if (el.className == "itunes-player error") { el.className = "itunes-player play"; setActiveTrack(num, false); }
}

const setActiveTrack = (num, playing) => {
	const prev = document.querySelector('tr.itunes-active-row');
	if (prev) prev.classList.remove('itunes-active-row');
	const row = document.querySelector('tr[data-track="' + num + '"]');
	if (row) row.classList.add('itunes-active-row');

	const data = top100Data[num] || { artist: '', title: '', art: '' };
	const rankEl = document.getElementById('sticky-rank');
	const artEl = document.getElementById('sticky-art');
	const artistEl = document.getElementById('sticky-artist');
	const titleEl = document.getElementById('sticky-title');
	const playBtn = document.getElementById('sticky-play');
	if (rankEl) rankEl.textContent = '#' + (num + 1);
	if (artistEl) artistEl.textContent = data.artist;
	if (titleEl) titleEl.textContent = data.title;
	if (artEl) {
		if (data.art) { artEl.src = data.art; artEl.style.visibility = 'visible'; }
		else { artEl.removeAttribute('src'); artEl.style.visibility = 'hidden'; }
	}
	if (playBtn) playBtn.textContent = playing ? 'Pause' : 'Play';

	currentPlayingNum = num;
	observeActiveRow(row);
}

const observeActiveRow = row => {
	if (stickyObserver) { stickyObserver.disconnect(); stickyObserver = null; }
	const sticky = document.getElementById('sticky-player');
	if (!row || !sticky) return;
	if (typeof IntersectionObserver === 'undefined') {
		showSticky(true);
		return;
	}
	stickyObserver = new IntersectionObserver(entries => {
		const e = entries[0];
		showSticky(!e.isIntersecting);
	}, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
	stickyObserver.observe(row);
}

const showSticky = on => {
	const sticky = document.getElementById('sticky-player');
	if (!sticky) return;
	sticky.classList.toggle('visible', !!on);
	document.body.classList.toggle('has-sticky-player', !!on);
}

const resetStickyPlayer = () => {
	if (stickyObserver) { stickyObserver.disconnect(); stickyObserver = null; }
	currentPlayingNum = null;
	showSticky(false);
}

const stickyPrev = () => {
	if (!top100Data.length) return;
	const cur = currentPlayingNum == null ? 0 : currentPlayingNum;
	const target = cur <= 0 ? top100Data.length - 1 : cur - 1;
	jumpToTrack(target);
}

const stickyNext = () => {
	if (!top100Data.length) return;
	const cur = currentPlayingNum == null ? -1 : currentPlayingNum;
	const target = cur >= top100Data.length - 1 ? 0 : cur + 1;
	jumpToTrack(target);
}

const stickyPlay = () => {
	if (currentPlayingNum == null) return;
	previewTrack(currentPlayingNum);
}

const jumpToTrack = num => {
	const el = document.getElementById('player-' + num);
	if (!el) return;
	if (el.className === 'itunes-player pause') {
		setActiveTrack(num, true);
		return;
	}
	previewTrack(num);
}

const getTrackNum = track => +track.id.substring(6);

var fadeAudioInterval = null;

const resetFadeAudio = audio => {
	clearInterval(fadeAudioInterval);
    fadeAudioInterval = null;
    audio.pause();
    audio.volume=1;
    audio.currentTime = 0;
    audio.parentNode.className = "itunes-player play";
}

const fadeAudio = audio => {
	   if (fadeAudioInterval) {
	   	resetFadeAudio(audio);
	   }
	   else {
	   	fadeAudioInterval = setInterval(() => {
        audio.parentNode.className = "itunes-player play";
        if (audio.volume >= 0.1) { 
        	const old_volume = audio.volume;
        	audio.volume -= 0.1;
        	if (audio.volume === old_volume) resetFadeAudio(audio);
        }
        else {
            resetFadeAudio(audio);
        }
    	}, 100);
	   }
}

window.onload = () => {
	initSelectCountry();
	for (let key in countries)
		Router.routes[key] = function() {
		  let choose_el = document.getElementById('choose');
		  choose_el.value = Router.route;
		  loadList(Router.route);
		};
		Router.routes["/"]
	Router.initRoute();
	window.addEventListener('popstate', () => Router.initRoute());
}

var Router = {
  route : "",
  routes : {"/" : function() { loadList(""); var choose_el = document.getElementById('choose'); choose_el.value = ""; }},
  initRoute : function() {
       this.route = window.location.pathname.split("/")[2] || "/";
       if (this.route && this.routes[this.route]) this.routes[this.route]();
  },
  go : function(url) {
       if (!url) url = "/itunes100";
       history.pushState({foo : "bar"}, "iTunes Top 100", url);
       this.route = url;
       if (this.routes[url]) this.routes[url](); else this.routes["/"]();
  }
};

