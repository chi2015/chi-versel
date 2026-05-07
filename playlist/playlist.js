Vue.component('playlist', {
	props: ['list'],
	template : '#playlist'
});

Vue.component('sublist', {
	props : ['title', 'list', 'score'],
	template : '#sublist'
});

Vue.component('song', {
	props : ['item', 'mode', 'num', 'countdown_mode', 'countdown_num'],
	template: '#song'
});

Vue.component('modal', {
	template: '#modal-template',
	props: ['show', 'confirmdelete', 'errortxt', 'actualdate', 'deletepassword'],
	methods: {
	  close: function () {
		this.$emit('close');
	  },
	  deletePlaylist: function() {
		this.$emit('delete', this.actualdate, this.deletepassword);
		this.$emit('close');
	  }
	}
  });

Vue.component('v-select', VueSelect.VueSelect);

var playlist_app = new Vue({
	el : "#playlist-app",
	data : {
		playlist_server : "/api/playlist",
		actual_date : false,
		latest_date : false,
		current_date : false,
		top100year : +moment().format('YYYY') - 1,
		current_year : +moment().format('YYYY') - 1,
		storage : {},
		top100_storage : {},
		top10_storage : {},
		loading : false,
		showLeftMenu : false,
		mode : 'main',
		years_array : [],
		is_mobile : false,
		showModal : false,
		errorTxt : false,
		confirmDelete: false,
		dragover : false,
		xDown : false,
		yDown : false,
		countdown_mode: false,
		countdown_num: 100,
	},
	watch : {
		actual_date : function() {
			if (!this.storage[this.actualDate]) { 
				this.loading = true;
				this.remote("current", {current_date : this.actualDate}, function(data) {
					if (data.date) { this.actual_date = "", this.actual_date = data.date; }
					if (data.list) this.setStorage(data.date, data.list);
					if (!this.current_date) this.current_date = this.actual_date;
					if (data.error) this.showError(data.error);
					this.loading = false;
				}.bind(this));
			}
		},
		top100year : function() {
			this.checkTopStorage();
			this.countdown_mode = this.top100year > this.current_year;
			this.countdown_num = 100;
		},
		mode : function() {
			if (this.mode!="main") this.checkTopStorage();
			this.countdown_mode = this.mode === 'top100' && this.top100year >= this.current_year;
			this.countdown_num = 100;
		}
	},
	created : function() {
		 for (var y=this.current_year+1; y>=2007; y--)
			this.years_array.push(y);
		this.actual_date = moment().format('YYYY-MM-DD');
	},
	computed: {		
		actualDate : function() {
			return this.actual_date.substring(0,10);
		}
	},
	mounted : function() {
	  window.addEventListener('resize', this.handleResize);
	  document.getElementById('playlist-app').classList.toggle('pl-loading')
	  this.handleResize();
	  this.showLeftMenu = !this.is_mobile;
	  this.initDragAndDropEvents();
	  this.initTouchEvents();
	},
	methods : {
		handleResize : function() {
			this.is_mobile = window.innerWidth < 800;
		},
		initDragAndDropEvents : function() {
			let playlistContent = document.body;
			let self = this;

			['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
				playlistContent.addEventListener(eventName, preventDefaults, false);
			  })
			  function preventDefaults (e) {
				e.preventDefault();
				e.stopPropagation();
			  }
			
			  ['dragenter', 'dragover'].forEach(eventName => {
				playlistContent.addEventListener(eventName, highlight, false);
			  })
			  ;['dragleave', 'drop'].forEach(eventName => {
				playlistContent.addEventListener(eventName, unhighlight, false);
			  })
			  function highlight(e) {
				playlistContent.classList.add('pl-dragover-new');
				self.dragover = true;
			  }
			  function unhighlight(e) {
				playlistContent.classList.remove('pl-dragover-new');
				self.dragover = false;
			  }

			  playlistContent.addEventListener('drop', handleDrop, false);

			  function handleDrop(e) {
				  let dt = e.dataTransfer;
				  let files = dt.files;
				  if (files.length > 0) self.upload_file(files[0]);
			  }
			  
		},
		initTouchEvents : function() {
			let playlistContent = document.getElementById('playlist-content');
			playlistContent.addEventListener('touchstart', (e) => { 
				this.xDown = e.touches[0].clientX;
				this.yDown = e.touches[0].clientY;
			});
			playlistContent.addEventListener('touchmove', (e) => {
				if (!this.xDown || !this.yDown) return;
				let xUp = e.touches[0].clientX;
				let yUp = e.touches[0].clientY;
				let xDiff = this.xDown - xUp;
				let yDiff = this.yDown - yUp;

				if (Math.abs(xDiff) > Math.abs(yDiff)) {
					if (xDiff > 0) this.move('right'); else this.move('left');
				}
				this.xDown = false;
				this.yDown = false;
			});
		},
		remote : function(action, params, cb) {
			this.loading = true;
			params = params || {};
			params.action = action;
			console.log("req body", JSON.stringify(params));
			fetch(this.playlist_server,
			{
				method: 'POST',
				headers: {
					'Accept': 'application/json, application/xml, text/play, text/html, *.*',
        			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
				},
				body: paramsToBodyStr(params)
			})
			.then((res) => { return res.json(); })
			.then((data) => { console.log( "FETCH remote response", data  );
				this.loading = false;
				cb(data);
			});
		},
		checkTopStorage : function() {
			var data_storage;
			if (this.mode=="top100") data_storage = this.top100_storage;
			if (this.mode=="top10artists") data_storage = this.top10_storage;
			if (!data_storage[this.top100year]) {
				this.loading = true;
				this.remote(this.mode, {year : this.top100year }, function(data) {
					if (data.year) { this.top100year = ""; this.top100year = data.year; }
					if (data.list) data_storage[this.top100year] = data.list;
					if (data.error) { 
						if (this.top100year > this.years_array[0]) this.top100year--;
						if (this.top100year < this.years_array[this.years_array.length - 1]) this.top100year++;
					}
					if (data.error) this.showError(data.error);
					this.loading = false;
				}.bind(this));
			}
		},
		setPlaylistData : function(data) {
			if (data.date) this.actual_date = data.date;
			if (data.list) this.setStorage(data.date, data.list);
			if (data.error) this.showError(data.error);
		},
		current : function() {
			this.showLeftMenu = !this.is_mobile;
			this.mode = 'main';
			if (this.storage[this.current_date]) 
			{
				this.actual_date = this.current_date;
			}
			else this.remote("current", {}, function(data) {
			  this.setPlaylistData(data);
			  if (data.date) this.current_date = data.date;
			}.bind(this));
		},
		latest : function() {
			this.showLeftMenu = !this.is_mobile;
			this.mode = 'main';
			if (this.latest_date && this.storage[this.latest_date]) {
				this.actual_date = this.latest_date;
			}
			else this.remote("latest", {}, function(data) {
			  this.setPlaylistData(data);
			  if (data.date) this.latest_date = data.date;
			}.bind(this));
		},
		archive: function(e) {
			document.querySelector('#calendar-date').focus();
		},
		nextprev : function(is_next) {
			var method = is_next ? "next" : "prev";
			var nextprev_date = is_next ? this.next_date(this.actualDate) : this.prev_date(this.actualDate);
			switch (this.mode) {
				case "main":
					if (this.storage[nextprev_date]) {
						this.actual_date = nextprev_date;
					}
					else this.remote(method, {pl_date : this.actualDate}, function(data) {
						this.setPlaylistData(data);
					}.bind(this));
					break;
				 case "top100":
			     case "top10artists":
					if (is_next) this.top100year++; else this.top100year--; break;
			}
		},
		next : function() {
			this.nextprev(true);
		},
		prev : function() {
		   this.nextprev(false);
		},
		move : function(direction) {
			this.showLeftMenu = this.showLeftMenu && !this.is_mobile;
			var pl_content = document.getElementById('playlist-content');
			pl_content.classList.add('move'+direction);
			setTimeout(() => { 
				pl_content.classList.remove('move'+direction) 
				if (direction == 'left') this.prev();
				if (direction == 'right') this.next();
			}, 300);
		},
		top100 : function() {
			this.showLeftMenu = !this.is_mobile;
			this.mode = 'top100';
		},
		top10artists : function() {
			this.showLeftMenu = !this.is_mobile;
			this.mode = 'top10artists';
		},
		down : function() {
			this.countdown_num--; 
		},
		openfile : function() {
			this.showLeftMenu = this.showLeftMenu && !this.is_mobile;
			document.getElementById('pl_file').click();
		},
		downloadPDF : function() {
			this.showLeftMenu = this.showLeftMenu && !this.is_mobile;
			function htmlDecode(input){
				var e = document.createElement('div');
				e.innerHTML = input;
				// handle case of empty input
				return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
			  }
			  
			let aListTableBody = [];
			let bListTableBody = [];
			let cListTableBody = [];
			this.storage[this.actualDate].forEach((plItem) => {
				console.log('pl item', plItem.artist)
				if (plItem.score == 47) aListTableBody.push({ text: htmlDecode(plItem.artist)+ ' - '+htmlDecode(plItem.title), fontSize: 16 });
				if (plItem.score == 28) bListTableBody.push({ text: htmlDecode(plItem.artist)+ ' - '+htmlDecode(plItem.title), fontSize: 16 });
				if (plItem.score == 23) cListTableBody.push({ text: htmlDecode(plItem.artist)+ ' - '+htmlDecode(plItem.title), fontSize: 16 });
			});
			console.log(cListTableBody);
			let docDefinition = {
				header : 'Playlist Date: '+this.actualDate,
				content : [
					{ text: 'A-List', fontSize: 13, bold: true, style: 'header', marginTop: 10 },
					...aListTableBody,
					{ text: 'B-List', fontSize: 13, bold: true, style: 'header', marginTop: 30 },
					...bListTableBody,
					{ text: 'C-List', fontSize: 13, bold: true, style: 'header', marginTop: 30 },
					...cListTableBody
				]
			};

			pdfMake.createPdf(docDefinition).open();
		},
		changefile : function() {
			var file = this.$refs.pl_file.files[0];
			this.upload_file(file);
		},
		upload_file: function(file) {
			if (file.size > 5120) {
				this.showError("Playlist file size cannot be more than 5KB");
				return;
			}
			var reader = new FileReader();
			this.loading = true;
			reader.readAsText(file, 'UTF-8');
			reader.onload = function(event) {
				var result = event.target.result;
				
				fetch(this.playlist_server,
					{
						method: "POST",
						headers: {
							'Accept': 'application/json, application/xml, text/play, text/html, *.*',
        					'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
						},
						body: paramsToBodyStr({ action: 'upload', data: result })
					})
					.then((res) => { return res.json(); })
					.then((data) => { console.log( "FETCH remote response", data  );
						if (data.ok && data.pl_date) { 
							console.log('update data'); 
							this.loading = false;
							this.update_data(data.pl_date); 
							this.actual_date = data.pl_date; 
						}
						else if (data.error) this.showError(data.error);
						else this.showError("Error uploading playlist");
				});

			}.bind(this);
		},
		update_data : function(date) { console.log("update data");
			if (moment(date, "YYYY-MM-DD").unix() > moment(this.latest_date, "YYYY-MM-DD").unix()) this.latest_date = date;
			if (moment(date, "YYYY-MM-DD").unix() <= moment().unix()) this.current_date = date;
			if (this.top100_storage[moment(date, "YYYY-MM-DD").format("YYYY")]) delete this.top100_storage[moment(date, "YYYY-MM-DD").format("YYYY")];
			if (this.top10_storage[moment(date, "YYYY-MM-DD").format("YYYY")]) delete this.top10_storage[moment(date, "YYYY-MM-DD").format("YYYY")];
		},
		confirm_delete: function() {
			this.showLeftMenu = !this.is_mobile;
			this.confirmDelete = true;
		},
		delete_playlist : function(plDate, pass) {
			this.remote("delete", { pl_date : plDate, password : pass }, function(data) {
				if (data.ok) {
					if (this.storage[plDate]) delete this.storage[plDate];
					if (this.top100_storage[moment(plDate, "YYYY-MM-DD").format("YYYY")]) delete this.top100_storage[moment(plDate, "YYYY-MM-DD").format("YYYY")];
					if (this.top10_storage[moment(plDate, "YYYY-MM-DD").format("YYYY")]) delete this.top10_storage[moment(plDate, "YYYY-MM-DD").format("YYYY")];
					this.latest();
				}
				else if (data.error) this.showError(data.error);
				else this.showError("Error deleting playlist"); 
			}.bind(this));
		},
		prev_date : function(date) {
		   return moment(date, "YYYY-MM-DD").subtract(7, "days").format("YYYY-MM-DD");
		},
		next_date : function(date) {
		   return moment(date, "YYYY-MM-DD").add(7, "days").format("YYYY-MM-DD");
		},
		itemInfoClass : function(item) {
			if (item.date_appear === this.actual_date) return 'pl-new';
			if (this.storage[this.prev_date(this.actual_date)]) {
				var prev_item = this.getItemById(this.storage[this.prev_date(this.actual_date)], item.id);
				if (prev_item) {
					if (+item.score > +prev_item.score) return 'pl-up';
					if (+item.score < +prev_item.score) return 'pl-down';
				}
				return false;
			}
			else return false;
		},
		getItemById : function(list, id) {
		   for (var i=0; i< list.length; i++)
			 if (list[i].id == id) return list[i];
		   return false;
	   },
	   setStorage : function(date, list) {
			this.storage[date] = list;
			this.storage[date].forEach(function(item) {
				item.item_class = this.itemInfoClass(item);
			}.bind(this))
	   },
	   toggleLeftMenu : function() {
		this.showLeftMenu = !this.showLeftMenu;
	   },
	   showError : function(error) {
		   this.errorTxt = error; 
	   }
	}
});

const paramsToBodyStr = (params) => {
    let arr = [];
    Object.keys(params).forEach((key) => {
        arr.push(`${key}=${encodeURIComponent(params[key])}`);
    });
    return arr.join('&');
};