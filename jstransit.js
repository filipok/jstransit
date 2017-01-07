// constants
var barWidth = 80; // bar chart width
var barStartX = 10; // bar chart starting X coordinate
var barStartY = 10; // bar chart starting Y coordinate
var textWidth = 9; // bar chart text width
var maxSpeed = 40; //km/h
var stopColor = 'aqua'; // bar chart stop ar color
var stopCircleColor = 'blue'; // map stop circle color
var stopFillColor = 'blue'; // map stop circle fill color
var redColor = 'red'; // bar chart red light color
var interColor = 'green'; // bar chart
var unknownColor = 'black'; // bar chart unknown segment cvolor
var stopLetter = '@'; // stop letter in timer
var redLetter = '*'; // red light letter in timer
var interLetter = '+'; // interstation letter in timer
var timerKeywordTime = 'Lap Time'; // timer keyword for time record
var timerKeywordName = 'Lap Description'; // timer keyword for lap description
var headers = ["De la", "La", "Distanță (km)", "Total (s)",
        "D/c stație (s)", "V (km/h)", "Pondere (%)"]; // data table headers
var setViewLat = 44.40;
var setViewLon = 26.10;
var setViewZoom = 13;
var mapid = 'mapid';

function getSeconds(timeString){
    var a = timeString.split(':');
    return (+a[0]) * 60 * 60 + (+a[1]) * 60 + Math.round((+a[2]));
}

function convertFromSeconds(seconds){
    var minutes = Math.floor(seconds/60);
    seconds = seconds % 60;
    var hours = Math.floor(minutes/60);
    minutes = minutes % 60;
    if (hours === 1){
        return hours + ' oră, ' + minutes + ' minute, ' + seconds + ' secunde';}
    else {
        return hours + ' ore, ' + minutes + ' minute, ' + seconds + ' secunde';}
}

function addSegment(ctx, increment, color, xPos, yPos, barWidth){
    ctx.fillStyle = color;
    ctx.fillRect(xPos, yPos, increment, barWidth);
}

function addLabel(ctx, stopName, position) {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.translate(position + textWidth, barStartY + 2*barWidth);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(stopName,0, 0);
    ctx.restore();
}

function displayContents(contents) {
    var element = document.getElementById('file-content');
    element.innerHTML = contents;
}

function addDataCell(text, row) {
    var dataCell = document.createElement("DIV");
    dataCell.className = "datacell";
    var dataText = document.createTextNode(text);
    dataCell.appendChild(dataText);
    //return data_cell;
    row.appendChild(dataCell);
}

function addRow(textArr, row){
    for(var i = 0; i < textArr.length; i++){
    addDataCell(textArr[i], row);
    }
}

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

function processTiming(timing, stopsLengths){
    var lines = timing.split('\n');
    var str;
    var durations = [];
    var laps = [];
    var current = barStartX;
    var labelPositions = [];
    var interstationMoves = [];
    var interstationStops = [];
    var stopsTimes = [];
    var segmentTypes = [];
    for(var line = lines.length ; line > 0; line--){
        str = lines[line-1];
        if (str.lastIndexOf(timerKeywordTime, 0) === 0){
            str = str.split(': ')[1];
            durations.push(str);
        }
        if (str.lastIndexOf(timerKeywordName, 0) === 0){
        //if (str.startsWith(timerKeywordName)){
            str = str.split(': ')[1];
            laps.push(str);
        }
    }
    for(var lap = 0; lap < laps.length; lap++){
        str = laps[lap];
        str = str.substring(0, str.length -1);
        var absDuration = getSeconds(durations[lap]);
        switch (str.substring(0, 1)){
            case redLetter:
                segmentTypes.push(redColor);
                interstationStops[interstationStops.length - 1] += absDuration;
                break;
            case stopLetter:
                labelPositions.push(current);
                segmentTypes.push(stopColor);
                interstationMoves.push(0);
                interstationStops.push(0);
                stopsTimes.push(absDuration);
                break;
            case interLetter:
                segmentTypes.push(interColor);
                interstationMoves[interstationMoves.length - 1] += absDuration;
                break;
            default:
                segmentTypes.push(unknownColor);
        }
    }

    var duration;
    // get total duration of laps
    var totalDuration = 0;
    for(lap = 0; lap < durations.length; lap++){
        duration = getSeconds(durations[lap]);
        totalDuration += duration;
    }


    var speeds = [];
    var greens = [];
    var reds = [];
    var percents = [];
    var totalInterstations = [];
    var segmentColors = [];
    for (var stop = 0; stop < stopsLengths.length; stop++){
        var speed = Math.round((stopsLengths[stop]/(interstationMoves[stop] +interstationStops[stop]))*3600*10)/10;
        speeds.push(speed);
        var green = Math.min(Math.round(2*255*speed/maxSpeed), 255);
        if(isNaN(green)){
            green = 0; // TODO
        }
        greens.push(green);
        var red = Math.min(Math.max(0,Math.round(2*255*(1-speed/maxSpeed))), 255);
        if(isNaN(red)){
            red = 0; // TODO
        }
        reds.push(red);
        segmentColors.push("rgb(" + red +"," + green + ",0)");
        var totalInterstation = interstationMoves[stop] +interstationStops[stop] + stopsTimes[stop];
        totalInterstations.push(totalInterstation);
        percents.push(Math.round((totalInterstation*100/totalDuration)*10)/10);
    }

    var res = {
        interstationMoves: interstationMoves,
        interstationStops: interstationStops,
        stopsTimes: stopsTimes,
        segmentTypes: segmentTypes,
        durations: durations,
        speeds: speeds,
        greens: greens,
        reds: reds,
        percents: percents,
        totalInterstations: totalInterstations,
        segmentColors: segmentColors,
        totalDuration: totalDuration
    };
    return res;
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
    var ways = relation.querySelectorAll('[type="way"]');
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

function createBarChart(segmentTypes, durations, totalDuration, names){
    var adjC = document.getElementById("adjCanvas");
    var adjCtx = adjC.getContext("2d");
    adjCtx.canvas.width  = window.innerWidth - 30;
    adjCtx.clearRect(0, 0, adjCtx.canvas.width, adjCtx.canvas.height);
    adjCtx.font = "10px Arial";

    var current = barStartX;
    var labelPositions = [];
    for(var lap = 0; lap < durations.length; lap++){
        if(segmentTypes[lap] ===  stopColor){
            labelPositions.push(current);
        }
        var absDuration = getSeconds(durations[lap]);
        var duration = Math.round(absDuration * (adjCtx.canvas.width - 20) / totalDuration);
        addSegment(adjCtx, duration, segmentTypes[lap], current, barStartY, barWidth);
        current += duration;

    }
    var stop;
    for (stop = 0; stop < names.length; stop++){
        addLabel(adjCtx, names[stop], labelPositions[stop]);
    }
}

function createTable(headers, names, stopsLengths, totalInterstations, stopsTimes, speeds, percentss, reds, greens,
    totalDuration){
    // find total length of the route
    var totalDistance = stopsLengths.reduce(function (a, b) { return a + b; }, 0);

    var dataTable = document.createElement("DIV");
    dataTable.className = "datatable";
    // header row
    var headerRow = document.createElement("DIV");
    headerRow.className = "headerrow";

    addRow(headers, headerRow);
    dataTable.appendChild(headerRow);

    for (var stop = 0; stop < names.length - 1; stop++){
        var dataRow = document.createElement("DIV");
        dataRow.className = "datarow";
        var rowText = [names[stop], names[stop+1], stopsLengths[stop].toFixed(3), totalInterstations[stop],
        stopsTimes[stop], speeds[stop], percentss[stop]];
        addRow(rowText, dataRow);
        dataRow.style.backgroundColor = "rgb(" + reds[stop] +"," + greens[stop] + ",0)";
        dataTable.appendChild(dataRow);
    }
    var summary = '';
    summary += 'Timp total: ' + convertFromSeconds(totalDuration) + '.\n';
    summary += 'Distanță totală: ' + Math.round(totalDistance*10)/10 + ' km.\n';
    summary += 'Viteză medie: ' + Math.round((totalDistance/totalDuration)*3600*10)/10 + ' km/h.\n';
    displayContents(summary);

    document.getElementsByTagName('body')[0].insertBefore(dataTable, document.getElementById('mapid'));

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

    var rel = {
        names: names,
        segments: segments,
        platformCoordinates: platformCoordinates,
        stopsLengths: stopsLengths
    };
    return rel;

}

function addRouteToMap(rel, res, L, xmlDoc, myMap){
    // add route segments to map
    for(i=0; i<rel.segments.length; i++){
        L.polyline(getArrayCoordinates(rel.segments[i], xmlDoc), {color: res.segmentColors[i], weight: 5}).addTo(myMap);
    }
    // add platforms to map and return markers to fit bounds
    var markers = displayPlatforms(rel.names, rel.platformCoordinates, res.stopsTimes, myMap);
    return markers;
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

function makeMap(timing, xmlDoc){

    // create base map and return myMap variable
    var myMap = baseMap(L);

    // process XML relation
    var rel = processRelation(xmlDoc);

    // process raw timing data
    var res = processTiming(timing, rel.stopsLengths);

    // create bar chart
    createBarChart(res.segmentTypes, res.durations, res.totalDuration, rel.names);

    // create data table
    createTable(headers, rel.names, rel.stopsLengths, res.totalInterstations, res.stopsTimes, res.speeds,
        res.percents, res.reds, res.greens, res.totalDuration);

    // add route to map
    var markers = addRouteToMap(rel, res, L, xmlDoc, myMap);

    var group = new L.featureGroup(markers);
    myMap.fitBounds(group.getBounds());
}

function readTimerFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var timing = e.target.result;
        // read chosen route
        var r = document.getElementById("route");
        var routeID = r.options[r.selectedIndex].value;
        var overpass1 = 'http://overpass-api.de/api/interpreter?data=relation(';
        var overpass2 =');out body;>;out body;rel(bn)["public_transport"="stop_area"];out body;';
        var overpass_full = overpass1 + routeID + overpass2;
        //display map and data
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var xmlDoc = this.responseXML;
                makeMap(timing, xmlDoc);
            }
        };
        xhttp.open("GET", overpass_full, true);
        xhttp.send();
    };
    reader.readAsText(file);
}
document.getElementById('timer-file-input').addEventListener('change', readTimerFile, false);