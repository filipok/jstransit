// constants
var barWidth = 80; // bar chart width
var barStartX = 10; // bar chart starting X coordinate
var barStartY = 10; // bar chart starting Y coordinate
var textWidth = 9; // bar chart text width
var maxSpeed = 40; //km/h
var stopColor = 'aqua'; // bar chart stop ar color
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

    return {
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
    dataTable.id = 'datatable';
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

function addTimedRelation(timing, relation, xmlDoc){

    // process XML relation
    var rel = processRelation(relation, xmlDoc);

    // process raw timing data
    var res = processTiming(timing, rel.stopsLengths);

    // create bar chart
    createBarChart(res.segmentTypes, res.durations, res.totalDuration, rel.names);

    // create data table
    createTable(headers, rel.names, rel.stopsLengths, res.totalInterstations, res.stopsTimes, res.speeds,
        res.percents, res.reds, res.greens, res.totalDuration);

    // create map objects
    var lines = addRouteToMap(rel, res, L, xmlDoc, myMap);
    var platforms = displayPlatforms(rel.names,
            rel.platformCoordinates, res.stopsTimes, myMap);
    return [lines, platforms];
}
