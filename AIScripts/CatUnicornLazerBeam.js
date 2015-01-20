/*****************************************************************************************
 * The goal of this AI is to quickly expand and group individuals for quick attack.
 * Last Update: 01/17/2015
 * Contributed by: Daniel Kotowski & Michael McLean
 ****************************************************************************************/
var msg = [];
var ID;
var Units;
var Bases;




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
				//pre-process entities
				processUnits(ev.data["Data"].units);
				processBases(ev.data["Data"].bases);

				//strategy response
				dataResponse();
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


closestEnemy = function(me, them){
	ce = null;
	dist = 0;
	if(me != null) {
		for (var i = 0; i < them.lenght; i++) {
			if (them[i].health > 0 && them[i].id > 0 && them[i].allegiance != ID) {

				var x = me.locx - them[i].locx;
				var y = me.locy - them[i].locy;
				d = Math.abs(me.locx - me.locx) + Math.abs(them[i].locy - them.locy);
				if (ce == null) {
					ce = them[i];
					dist = d;
				}
				else if (d < dist) {
					ce = them[i];
					dist = d;
				}
			}
		}
	}
	return ce;
}

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

processUnits = function(units){
	p_units = {
		mine:[],
		enemies:[]
	}

	for(var i=0;i<units.length;i++){
		unit = units[i];
		if(unit.allegiance == ID){
			p_units.mine.push(unit);
		}
		else if(unit.health > 0){
			p_units.enemies.push(unit);
		}
	}

	Units = p_units;
	p_units.enemies.sort(enemySort);

}





processBases = function(bases){

	p_bases =  {
		open:[],
		mine:[],
		enemies:[]
	};

	for(var i=0;i<bases.length;i++){

		base = bases[i];
		if(base.allegiance == ID){
			p_bases.mine.push(base);
		}else if(base.allegiance < 0){
			p_bases.open.push(base);
		}else{
			p_bases.enemies.push(base);
		}
	}

	Bases =  p_bases;
	Bases.open.sort(baseSort);
	Bases.enemies.sort(baseSort);

}

/* Consistent Distance Fucntion */
distance = function(x1,y1,x2,y2){

	deltaX = (x1-x2);
	deltaY = (y1-y2);

	return(Math.sqrt((deltaX*deltaX) + (deltaY*deltaY)));
}


enemyRating = function(e){
	ret = 0;

	for(var i=0;i<Units.mine.length;i++){
		unit = Units.mine[i];
		ret += distance(e.locx, e.locy,unit.locx,unit.locy)*e.health;
	}

	return ret;
}


enemySort = function(e1,e2){
	return enemyRating(e1) - enemyRating(e2);
}

baseDistanceFromUnits = function(b){
	ret = 0;
	for(var i=0;i<Units.mine.length;i++){
		unit = Units.mine[i];
		ret += distance(b.locx, b.locy,unit.locx, unit.locy);
	}
	return ret;
}


baseSort = function(b1,b2){
	return baseDistanceFromUnits(b1) -  baseDistanceFromUnits(b2);
}


orderAttack = function(unit,enemy){
	return {"unitID": unit.id, "move": "", "dash":"", "attack":enemy.id, "farm": false};
}

orderFarm = function(unit){
	return 	{"unitID": unit.id, "move":"", "dash":"", "attack": "", "farm": true};
}

orderMove = function(unit,dir){

	return {"unitID": unit.id, "move": "", "dash": dir, "attack": "", "farm": false};
}



dataResponse = function () {

	//TODO: Rework logic to reflect pre-processed and sorted data
	orders = [];
	unitsFarming = 0;
	unitsAttacking = 0;

	//Go through units and give them an order
	for (var i = 0; i < Units.mine.length; i++) {
		var unit = Units.mine[i];
		
		orders.push(orderFarm(unit));

	}






	/*for (var i = 0; i < myGuys.length; i++) {

		var unit = myGuys[i];

		*//* Farm and Expand code *//*
		for (var j = 0; j < myBases.length; j++) {

			//Defend base
			if(isUnitInBase(myBases[j], unit) && isEnemyInBase(myBases[j],enemies)){
				enemy = closestEnemy(unit,enemies);

				if (enemyInRange(unit, enemies)>=0) {
					orders.push({"unitID": unit.id, "move":"", "dash": "", "attack": enemy.id, "farm": false});
				}
				else {
					dir = getDir(unit.locx, unit.locy, enemy.locx, enemy.locy);
					orders.push({"unitID": unit.id, "move": "", "dash": dir, "attack": "", "farm": false});
				}
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
					orders.push({"unitID": unit.id, "move":"", "dash": dir, "attack": "", "farm": false});
				}
			}
			else {
				attackSquads.push(unit)
			}
		}
	}
	for (var i = 0; i < attackSquads.length; i++) {
		var unit = attackSquads[i];

		//TODO: Finish implementing attack behaviour
		if (enemyInRange(unit, enemies)>=0) {
			enemy = closestEnemy(unit, enemies);
			orders.push({"unitID": unit.id, "move":"", "dash": "", "attack": enemy.id, "farm": false});
		}
		else{
			enemy = closestEnemy(unit,enemies);
			dir = getDir(unit.locx, unit.locy, enemy.locx, enemy.locy);
			orders.push({"unitID": unit.id, "move":"", "dash": dir, "attack": "", "farm": false});
		}
	}
*/
	//post message back to AI Manager	
	postMessage( { "Orders" : orders } );		
}