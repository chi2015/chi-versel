const countries = {
	'gb':'UK',
	'us':'USA',
	'au':'Australia',
	'ca':'Canada',
	'nz':'New Zealand',
	'ie':'Ireland',
	'ru':'Russia'
}

const parseResponse = res => {
	let ret_str = 'Error connecting iTunes Feed';
	console.log('response', res);
	if (res.feed && res.feed.entry)
	{
		const top100 = res.feed.entry;
		ret_str = '<table><tr><th>No</th><th></th><th>Artist - Song</th><th>Release date</th><th></th></tr>';
		for (var i=0; i<top100.length; i++)
		{
			var n = i+1;
			ret_str += '<tr><td>' 
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
	  }
	  else
	  if (el.className == "itunes-player pause") {
	  	if (!track.paused) track.pause();
	  	el.className = "itunes-player play";
	  } else if (el.className == "itunes-player error") el.className = "itunes-player play";
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

