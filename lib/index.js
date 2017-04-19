var ipc = require('ipc');
ipc.on('coverUrl', function(url) {
	document.querySelectorAll('.background')[0].src = url;
	document.querySelectorAll('.cover')[0].src = url;
});
ipc.on('title', function(title) {
	document.getElementById('title').innerHTML = title;
	document.getElementById('track-info').style.opacity = 1;
});
ipc.on('album', function(album) {
	document.getElementById('album').innerHTML = album;
});
ipc.on('artist', function(artist) {
	document.getElementById('artist').innerHTML = artist;
});
ipc.on('loadingText', function(text) {
	document.getElementById('loading').innerHTML = text;
});
ipc.on('seek', function(text) {
	document.getElementById('position').style.width = text*100 + "%";
});
document.onkeydown = function(e) {
	e = e || window.event;
	if (e.keyCode == 27) { //ESC
	    require('remote').getCurrentWindow().close();
	}
	/*else if (e.keyCode == 84) { //T

	}*/
};

function myCount(t) {

	var d = new Date();
	var h = d.getHours();
	var m = d.getMinutes();
	//var s = d.getSeconds();

	h = h>12?h-12:h;

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
	if(firstLoad) {
		firstLoad = false;
		resetTransition();
		return;
	}
	clearTimeout(resetTimeout);
	document.querySelectorAll('.background')[1].className = "background hidden";
	resetTimeout = setTimeout(resetTransition, 1000);
}