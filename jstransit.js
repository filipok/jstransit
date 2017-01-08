// constants
var stopCircleColor = 'blue'; // map stop circle color
var stopFillColor = 'blue'; // map stop circle fill color
var setViewLat = 44.40;
var setViewLon = 26.10;
var setViewZoom = 13;
var mapid = 'mapid';

function getRefs(roleName, relation){
    var refList = [];
    var selector = '[role=' + roleName + ']';
    var objList = relation.querySelectorAll(selector);
    for(var p = 0; p < objList.length; p++){
        refList.push(objList[p].getAttribute("ref"));
    }
    return refList;
}

function getCoordinates(ref, xmlDoc){
    var selector = '[id="' + ref + '"]';
    var node = xmlDoc.querySelectorAll(selector)[0];
    var lat = parseFloat(node.getAttribute("lat"));
    var lon = parseFloat(node.getAttribute("lon"));
    return [lat, lon];
}

function getArrayCoordinates(array, xmlDoc){
    var res = [];
    for(var i=0; i<array.length; i++){
        res.push(getCoordinates(array[i], xmlDoc));
    }
    return res;
}

function segmentReferences(waypointReferences, stopReferences){
    var left = 0;
    var right = 0;
    var started = false;
    var counter =  0;
    var segments = [];

    for(var p = 0; p < waypointReferences.length; p++){
        // try to separate segments between stops
        if(waypointReferences[p] === stopReferences[counter]){
            counter ++;
            if(started){
                right = p;
                segments.push(waypointReferences.slice(left, right +1));
                left = p; // starting new segment
            } else {
                left = p;
                started = true;
            }
        }
    }
    return segments;
}

function displayPlatforms(names, coordinates, stopsTimes, myMap){
    // display platforms
    var markers = [];
    var circle;
    for(var p = 0; p < names.length; p++){
        var stopTime = stopsTimes[p];
        if (stopTime === undefined){
            stopTime = 16;
        }
        circle = L.circle([coordinates[p][0], coordinates[p][1]], {
            color: stopCircleColor,
            weight: 2,
            fillColor: stopFillColor,
            fillOpacity: 0.1,
            radius: 15*Math.max(1.5, Math.sqrt(stopTime))
        }).addTo(myMap)
            .bindPopup(names[p]);
    markers.push(circle);
    }
    return markers;
}

Number.prototype.toRad = function() {
   return this * Math.PI / 180;
};

function twoPointLength(lat1, lon1, lat2, lon2){
	// http://stackoverflow.com/questions/14560999/using-the-haversine-formula-in-javascript
	var R = 6371; // km
	//has a problem with the .toRad() method below.
	var x1 = lat2-lat1;
	var dLat = x1.toRad();
	var x2 = lon2-lon1;
	var dLon = x2.toRad();
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	                Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
	                Math.sin(dLon/2) * Math.sin(dLon/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

function segmentLength(segmentArray, xmlDoc){
	var segmLength = 0;
	var startPoint = [];
	var endPoint = [];
	for(var k = 0; k < segmentArray.length - 1; k++){
		startPoint = getCoordinates(segmentArray[k], xmlDoc);
		endPoint = getCoordinates(segmentArray[k+1], xmlDoc);
		segmLength += twoPointLength(startPoint[0], startPoint[1], endPoint[0], endPoint[1]);
	}
	return segmLength;
}

function joinWays(relation, xmlDoc){
        // get ways and display route
    var wayReferences = [];
    var waypointReferences = [];
    var ways = relation.querySelectorAll('[type="way"]'); // TODO doar alea care nu sunt platforma
    // get way refs
    for(p = 0; p < ways.length; p++){
        wayReferences.push(ways[p].getAttribute("ref"));
    }
    // for each way, get point and add to route
    for(var p = 0; p < wayReferences.length; p++){
        var selector = '[id="' + wayReferences[p] + '"]';
        var way = xmlDoc.querySelectorAll(selector)[0];
        var wayPoints = way.getElementsByTagName("nd");
        var currentPoints = [];
        for (var w = 0; w < wayPoints.length; w ++){
            var ref = wayPoints[w].getAttribute("ref");
            currentPoints.push(ref);
        }
        // first segment
        if(p === 0){
            waypointReferences = waypointReferences.concat(currentPoints);
            continue;
        }
        // last route point === first point of current segment
        if(waypointReferences[waypointReferences.length-1] === currentPoints[0]){
            waypointReferences = waypointReferences.concat(currentPoints);
            continue;
        }
        // last route point === last point of current segment
        if(waypointReferences[waypointReferences.length-1] === currentPoints[currentPoints.length-1]){
            waypointReferences = waypointReferences.concat(currentPoints.reverse());
            continue;
        }
        // first route point === first point  of current segment
        // it can happen only immediately after first segment
        if(waypointReferences[0] === currentPoints[0]){
            waypointReferences = waypointReferences.reverse();
            waypointReferences = waypointReferences.concat(currentPoints);
            continue;
        }
        // first route point === last point of current segment
        // it can happen only immediately after first segment
        if(waypointReferences[0] === currentPoints[currentPoints.length-1]){
            waypointReferences = waypointReferences.reverse();
            waypointReferences = waypointReferences.concat(currentPoints.reverse());
            continue;
        }
        console.log("ERROR: WAYS NOT CONNECTED!");
        alert("ERROR: WAYS NOT CONNECTED!");

    }
    return waypointReferences;
}

function processRelation(xmlDoc){
    var names = [];
    var stopsLengths = [];

    // extract relation element
    var relation = xmlDoc.getElementsByTagName("relation")[0];
    // get platform refs and stop position refs
    var platformReferences = getRefs('platform', relation);
    var stopReferences = getRefs('stop', relation);
    // join ways to create full route
    var waypointReferences = joinWays(relation, xmlDoc);
    // create separate route segments
    var segments = segmentReferences(waypointReferences, stopReferences);
    // calculate segment lengths and total distance
    var segment;
    for(var i = 0; i< segments.length; i++){
        segment = segmentLength(segments[i], xmlDoc);
        stopsLengths.push(segment);
    }
    // get platform names and coordinates
    var platformCoordinates = [];
    for(var p = 0; p < platformReferences.length; p++){
        platformCoordinates.push(getCoordinates(platformReferences[p], xmlDoc));
        var selector = '[id="' + platformReferences[p].toString() + '"]';
        var platform = xmlDoc.querySelectorAll(selector)[0];
        names.push(platform.querySelectorAll('[k="name"]')[0].getAttribute("v"));
    }

    return {
        names: names,
        segments: segments,
        platformCoordinates: platformCoordinates,
        stopsLengths: stopsLengths
    };
}

function addRouteToMap(rel, res, L, xmlDoc, myMap){
    // add route segments to map
    for(i=0; i<rel.segments.length; i++){
        L.polyline(getArrayCoordinates(rel.segments[i], xmlDoc), {color: res.segmentColors[i], weight: 5}).addTo(myMap);
    }
    // add platforms to map and return markers to fit bounds
    return displayPlatforms(rel.names, rel.platformCoordinates, res.stopsTimes, myMap);
}

function baseMap(L){
    var myMap = L.map(mapid).setView([setViewLat, setViewLon], setViewZoom);
    L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(myMap);
    // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    // }).addTo(myMap);
    return myMap;
}

function addMultipleRoutes(relList, relColors){
    var myMap = baseMap(L);
    var relation, xhttp;
    for(var i=0; i<relList.length; i++){
        // magic: http://stackoverflow.com/questions/6077357/passing-index-from-for-loop-to-ajax-callback-function-javascript
        (function(i) {
            routeID = relList[i];
            var overpass1 = 'http://overpass-api.de/api/interpreter?data=relation(';
            var overpass2 =');out body;>;out body;rel(bn)["public_transport"="stop_area"];out body;';
            var overpass_full = overpass1 + routeID + overpass2;
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var xmlDoc = this.responseXML;
                    var rel = processRelation(xmlDoc);
                    var lengths = rel.names.length;
                    var res = {};
                    res.segmentColors = Array(lengths).fill(relColors[i]);
                    res.stopsTimes = Array(lengths).fill(30);
                    var markers = addRouteToMap(rel, res, L, xmlDoc, myMap);
                }
            };
            xhttp.open("GET", overpass_full, true);
            xhttp.send();
        })(i);
    }
}