// local storage helpers - source: http://stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage/3146971#3146971
Storage.prototype.setObject = function( key, value ) {
	this.setItem( key, JSON.stringify( value ) );
}

Storage.prototype.getObject = function( key ) {
	var value = this.getItem( key );
	return value && JSON.parse( value );
}

Storage.prototype.removeObject = function( key ) {
	this.removeItem( key );
}

$.storageDefaults = {
	'mute': 0,
	'autofire': 0,
	'score': 0,
	'level': 0,		
	'rounds': 0,
	'kills': 0,
	'bullets': 0,
	'powerups': 0,		
	'time': 0,
	// Overdrive additions
	'credits': 0,
	'difficulty': 'normal',
	'upgrades': {},
	'bestcombo': 0
};

$.setupStorage = function() {
	var loaded = localStorage.getObject( 'radiusraid' );
	$.storage = {};
	// merge loaded values over defaults so old saves keep working
	for( var k in $.storageDefaults ) {
		$.storage[ k ] = ( loaded && typeof loaded[ k ] != 'undefined' ) ? loaded[ k ] : $.storageDefaults[ k ];
	}
};

$.updateStorage = function() {
	localStorage.setObject( 'radiusraid', $.storage );
};

$.clearStorage = function() {
	localStorage.removeObject( 'radiusraid' );
	$.setupStorage();
};
