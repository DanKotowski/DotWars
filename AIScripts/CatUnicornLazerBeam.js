/*****************************************************************************************
 * The goal of this AI is to quickly expand and group individuals for quick attack.
 * Last Update: 01/17/2015
 * Contributed by: Daniel Kotowski & Michael McLean
 ****************************************************************************************/
var max = 500;
var min = 1500;
var delay = Math.floor(Math.random() * (max - min + 1)) + min;;
var msg = [];
var popMet = false
var ID;
var homeBase;
var foundHomeBase = false;
var base = -1;


onmessage = function ( ev ) {
	for( var cmd in ev.data ) {
		switch( cmd ) {
			case "setID":
				//used so I can identify which units the game has classified as 'mine'
				ID = ev.data[cmd];
				while (msg.length > 0) {
		    		msg.pop();
				}
				break;
			default:
				//strategy response
				dataResponse( ev );
		}
	}	
};

/*****************************************************************************************
 * Utility Functions
 ****************************************************************************************/

 //checks if an enemy unit is in attacking range.  If there are multiple, select the 
 //weakest
enemyInRange = function( me, them ) {
	targetLife = 999;
	target = -1;
	for( var i = 0;  i < them.length; i++ ) {
		if( them[i].health <= 0 || them[i].id < 0 ) {
			continue;
		}
		var x = me.locx - them[i].locx;
		var y = me.locy - them[i].locy;
		if( x*x + y*y < me.atkRadius*me.atkRadius && them[i].health < targetLife ) {
			targetLife = them[i].health;
			target = them[i].id;
		}
	}
	return target;
};

closetEnemy = function(me, them){
	
	ce = null;
	dist = 0;

	for( var i = 0;  i < them.length; i++ ) {
		if (them[i].health <= 0 || them[i].id < 0) {
			continue;
		}
		var x = me.locx - them[i].locx;
		var y = me.locy - them[i].locy;
		d = Math.sqrt(x * x + y * y);
		if (ce == null) {
			ce = them[i];
			dist = d;
		}
		else if (d < dist) {
			ce = them[i];
			dist = d;
		}
	}

	return ce;

};



//identify the direction i should move in to get to a target destination
getDir = function( x1, y1, x2, y2 ) {
	var w = x1 - x2;
	var h = y1 - y2;
	if( Math.abs( w ) > Math.abs( h ) ){
		if( w < 0 ) {
			return "right";
		} else {
			return "left";
		}
	} else {
		if( h < 0 ) {
			return "down";
		} else {
			return "up";
		}
	}
	return "";
};

getOppisiteDir = function(dir){

	if (dir === 'right') {
		dir = 'left';
	} else if (dir === 'left') {
		dir = 'right';
	} else if(dir === 'up'){
		dir = 'down';
	}else if(dir === 'down'){
		dir = 'up';
	}

	return dir;
}


isUnitInBase = function ( base, unit ) {
	var x = base.locx - unit.locx;
	var y = base.locy - unit.locy;
	if ( x*x + y*y < base.R*base.R ) {
		return true;
	}	
	return false;
}

//check if enemies are inside a base
isEnemyInBase = function( base, foes ) {
	for( var i = 0; i < foes.length; i++ ) {
		if( foes[i].health <= 0 ) {
			continue;
		}

		if( isUnitInBase( base, foes[i] ) ) {
			return true;
		}
	}
	return false;
};

ownedBase = function( bases ) {
	for( var i = 0; i < bases.length; i++ ) {
		if( bases[i].allegiance == ID ) {
			return bases[i];
		}
	}
	return -1;
}

getMyBases = function(bases){
	var myBases = [];
	for( var i=0;i<bases.length; i++){
		if(bases[i].allegiance == ID){
			myBases.push(bases[i]);
		}
	}

	return myBases;
}

farmingUnitsInBase = function(farmingUnits, base){

	var count = 0;

	for(var i=0;i<farmingUnits.length; i++){
		if(isUnitInBase(base, farmingUnits[i])){
			count++;
		}
	}

	return count;
}

closestOpenBase = function(bases,unit){

	dist = 9999999;
	cBase = -1;
	for(var i=0;i<bases.length;i++){
		if(bases[i].allegiance < 0){
			b_dist = Math.abs(bases[i].locx - unit.locx) + Math.abs(bases[i].locy - unit.locy);
			if(b_dist < dist){
				cBase = bases[i];
				dist = b_dist;
			}

		}
	}
	return cBase;
};


unitIsExpanding = function(unit, expansionUnits) {

	for(var i=0;i<expansionUnits.length;i++){
		if(unit.id == expansionUnits[i].id)
			return true;
	}
	return false;
};


unitIsFarming = function (unit, farmingUnits) {

	for(var i=0;i<farmingUnits.length;i++){
		if(unit.id == farmingUnits[i].id)
			return true;
	}
	return false;
};
dataResponse = function ( ev ) {
	//randomly assign a direction to each unit, and attempt to farm
	orders = [];
	dirs = ["up", "down", "left", "right", "in"];
	u = ev.data["Data"].units;

	myGuys = [];
	myBases = [];
	enemies = [];
	attackSquads = [];
	farmingUnits = [];
	expansionUnits = [];

	//TODO: Pre process bases and enemies
	bases = ev.data["Data"].bases;
	myBases = getMyBases(bases);

	for (var i = 0; i < u.length; i++) {
		if (u[i].allegiance == this.ID) {
			myGuys.push(u[i]);
		}
		else {
			enemies.push(u[i]);
		}
	}

	for (var i = 0; i < myGuys.length; i++) {

		var unit = myGuys[i];

		/* Farm and Expand code */
		for (var j = 0; j < myBases.length; j++) {

			//Defend base
			if(isUnitInBase(myBases[j], unit) && isEnemyInBase(myBases[j],enemies)){

			}
			else{
				//Set farmers
				if (farmingUnitsInBase(farmingUnits, myBases[j]) < 2 && isUnitInBase(myBases[j], unit)) {
					farmingUnits.push(unit);
					orders.push({"unitID": unit.id, "move": "", "dash": "", "attack": "", "farm": true});
				}
			}
		}
		if (!unitIsFarming(unit, farmingUnits) && !unitIsExpanding(unit, expansionUnits)) {
			cBase = closestOpenBase(bases, unit);
			if (cBase != -1) {
				expansionUnits.push(unit);
				if (isUnitInBase(cBase, unit)) {
					orders.push({"unitID": unit.id, "move": "", "dash": "", "attack": "", "farm": true});
				}
				else {
					dir = getDir(unit.locx, unit.locy, cBase.locx, cBase.locy);
					orders.push({"unitID": unit.id, "move": dir, "dash": "", "attack": "", "farm": false});
				}
			}
			else {
				attackSquads.push(unit)
			}
		}
	}
	for (var i = 0; i < attackSquads.length; i++) {
		var unit = attackSquads[i];

		mark = closetEnemy(me,enemies);


		//TODO: Finish implementing attack behaviour
		if (enemyInRange(unit, enemies)>=0) {
			enemy = closetEnemy(unit, enemies);
			orders.push({"unitID": unit.id, "move":"", "dash": "", "attack": enemy.id, "farm": false});
		}
		else{
			orders.push({"unitID": unit.id, "move":"", "dash": mark.id, "attack": "", "farm": false});
		}
	}

	//post message back to AI Manager	
	postMessage( { "Orders" : orders } );		
}