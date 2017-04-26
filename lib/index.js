	var singleSpace = false;
	var exitConfirm = false;

	document.onkeydown = function (e) {
		e = e || window.event;
		if (e.keyCode == 27) {
			if (searchBox.visible)
				searchBox.hide();
			else {
				if (exitConfirm)
					main.getCurrentWindow().close();
				else {
					var exit = document.getElementById('confirm-quit');
					exit.style.opacity = 1;
					exitConfirm = true;
				}
			}
		}
		else if (e.keyCode == 32 && !searchBox.visible && !exitConfirm) {
			if (singleSpace) {
				try {
					searchBox.show();
				}
				catch (error) {
					alert(error.message);
				}
				singleSpace = false;
				e.preventDefault();
			}
			else {
				singleSpace = true;
				setTimeout(function () {
					singleSpace = false;
				}, 500);
				e.preventDefault();
			}
		}
		else if (exitConfirm) {
			var exit = document.getElementById('confirm-quit');
			exit.style.opacity = 0;
			exitConfirm = false;
		}
	};

	function myCount(t) {

		var d = new Date();
		var h = d.getHours();
		var m = d.getMinutes();
		//var s = d.getSeconds();

		h = h > 12 ? h - 12 : h;

		m = timeCheck(m); //, s = timeCheck(s);

		document.getElementById('hours').innerHTML = h;
		document.getElementById('minutes').innerHTML = m;
		// document.getElementById('seconds').innerHTML = s;
	}

	function timeCheck(i) {
		if (i < 10) {
			i = "0" + i;
		}
		return i;
	}

	setInterval(function () {
		myCount();
	}, 1000);

	function resetTransition() {
		document.getElementsByClassName('background')[1].src = document.getElementsByClassName('background')[0].src;
		document.getElementsByClassName('background')[1].className = "background";
	}

	var resetTimeout = 0;
	var firstLoad = true;

	function transitionAlbum() {
		if (firstLoad) {
			firstLoad = false;
			resetTransition();
			return;
		}
		clearTimeout(resetTimeout);
		document.querySelectorAll('.background')[1].className = "background hidden";
		resetTimeout = setTimeout(resetTransition, 1000);
	}

	var searchBox = {
		init: false,
		visible: false,
		lastQuery: "",
		hide: function () {
			document.getElementById('search').className = "";
			this.hideResults();
			this.visible = false;
			this.lastQuery = "";
		},
		show: function () {
			var search = document.getElementById('search');
			var input = search.getElementsByTagName('input')[0];

			if (!this.init) {
				this.init = true;
				input.onkeyup = this.onchange;
			}

			input.value = "";
			input.focus();

			search.className = "visible";
			this.visible = true;
		},
		onchange: function (e) {
			if (searchBox.visible) {
				var query = String(e.target.value).trim().toLowerCase();
				if (query != searchBox.lastQuery && query != "") {
					clearTimeout(searchBox.searchTimer);
					searchBox.searchTimer = setTimeout(function () {
						main.getSearchInfo(query);
					}, 1000);
				}
				else if (query == "")
					searchBox.hideResults();

			}
		},
		showResults: function (data) {
			if (data.query = searchBox.lastQuery)
				return;
			var searchResults = document.getElementById('search-results');
			while (searchResults.hasChildNodes())
				searchResults.removeChild(searchResults.lastChild);

			function addCategory(title) {
				var span = document.createElement('span');
				span.className = 'results-category';
				span.innerHTML = title;
				searchResults.appendChild(span);
			}

			function addResult(artistOnly, art, firstline, secondline) {
				var result = document.createElement('div');
				result.className = 'result' + (artistOnly ? ' round' : '');

				var image = document.createElement('img');
				image.src = art;
				result.appendChild(image);

				var div = document.createElement('div');
				var title = document.createElement('span');
				title.className = 'title';
				title.innerHTML = firstline;
				div.appendChild(title);

				if (!artistOnly) {
					var title = document.createElement('span');
					title.className = 'title';
					title.innerHTML = secondline;
					div.appendChild(title);
				}

				result.appendChild(div);
				searchResults.appendChild(result);
			}

			var tracks = data.tracks.items;
			var artists = data.artists.items;
			var albums = data.albums.items;

			if (tracks.length + albums.length + artists.length == 0) {
				searchBox.hideResults();
				return;
			}

			if (tracks.length) {
				addCategory('SONGS');
				for (var i = 0; i < 3 && i < tracks.length; i++)
					addResult(false,
						tracks[i].album.images[2] ? tracks[i].album.images[2].url : "",
						tracks[i].name,
						tracks[i].album.name);
			}

			if (artists.length) {
				addCategory('ARTISTS');
				for (var i = 0; i < 3 && i < artists.length; i++)
					addResult(true,
						artists[i].images[2] ? artists[i].images[2].url : "",
						artists[i].name);
			}

			if (artists.length) {
				addCategory('ALBUMS');
				for (var i = 0; i < 3 && i < artists.length; i++)
					addResult(false,
						albums[i].images[2] ? albums[i].images[2].url : "",
						albums[i].name,
						albums[i].artists.length == 1 ? albums[i].artists[0].name : "Various Artists")
			}

			var height = searchResults.clientHeight + 50;
			document.getElementById('search').style.height = height + "px";
		},
		hideResults: function () {
			document.getElementById('search').style.height = "50px";
		},
		searchTimer: null
	}

	var main = Object();
	main.getSearchInfo = require('remote').getGlobal("getSearchInfo");
	main.getCurrentWindow = require('remote').getCurrentWindow;

	var ipc = require('ipc');
	ipc.on('coverUrl', function (url) {
		document.querySelectorAll('.background')[0].src = url;
		document.querySelectorAll('.cover')[0].src = url;
	});
	ipc.on('title', function (title) {
		document.getElementById('title').innerHTML = title;
		document.getElementById('track-info').style.opacity = 1;
	});
	ipc.on('album', function (album) {
		document.getElementById('album').innerHTML = album;
	});
	ipc.on('artist', function (artist) {
		document.getElementById('artist').innerHTML = artist;
	});
	ipc.on('loadingText', function (text) {
		document.getElementById('loading').innerHTML = text;
	});
	ipc.on('seek', function (text) {
		document.getElementById('position').style.width = text * 100 + "%";
	});

	ipc.on('searchResults', searchBox.showResults);
