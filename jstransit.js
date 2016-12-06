// constants
var barwidth = 80;
var barstart_x = 10;
var barstart_y = 10;
var text_width = 9;
var max_speed = 40; //km/h
var stop_color = 'aqua';
var red_color = 'red';
var inter_color = 'green';
var unknown_color = 'black';
var stop_letter = '@';
var red_letter = '*';
var inter_letter = '+';
var timer_keyword_time = 'Lap Time';
var timer_keyword_name = 'Lap Description';
var headers = ["De la", "La", "Distanță (km)", "Total (s)",
        "D/c stație (s)", "V (km/h)", "Pondere (%)"];

function get_seconds(timestring){
    var a = timestring.split(':');
    return (+a[0]) * 60 * 60 + (+a[1]) * 60 + Math.round((+a[2]));
}

function convert_from_seconds(seconds){
    var minutes = Math.floor(seconds/60);
    seconds = seconds % 60;
    var hours = Math.floor(minutes/60);
    minutes = minutes % 60;
    if (hours === 1){
        return hours + ' oră, ' + minutes + ' minute, ' + seconds + ' secunde';}
    else {
        return hours + ' ore, ' + minutes + ' minute, ' + seconds + ' secunde';}
}

function addSegment(ctx, increment, color, x_pos, y_pos, bar_width){
    ctx.fillStyle = color;
    ctx.fillRect(x_pos, y_pos, increment, bar_width);
}

function addLabel(ctx, stop_name, position) {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.translate(position + text_width, barstart_y + 2*barwidth);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(stop_name,0, 0);
    ctx.restore();
}

function displayContents(contents) {
    var element = document.getElementById('file-content');
    element.innerHTML = contents;
}

function add_data_cell(text, row) {
    var data_cell = document.createElement("DIV");
    data_cell.className = "datacell";
    var data_text = document.createTextNode(text);
    data_cell.appendChild(data_text);
    //return data_cell;
    row.appendChild(data_cell);
}

function add_row(text_arr, row){
    for(var i = 0; i < text_arr.length; i++){
    add_data_cell(text_arr[i], row);
    }
}

function get_refs(role_name, relation){
    var ref_list = [];
    var selector = '[role=' + role_name + ']';
    var obj_list = relation.querySelectorAll(selector);
    for(p = 0; p < obj_list.length; p++){
        ref_list.push(obj_list[p].getAttribute("ref"));
    }
    return ref_list;
}

function get_coords(ref, xmlDoc){
    var selector = '[id="' + ref + '"]';
    var node = xmlDoc.querySelectorAll(selector)[0];
    var lat = parseFloat(node.getAttribute("lat"));
    var lon = parseFloat(node.getAttribute("lon"));
    return [lat, lon];
}

function get_array_coords(array, xmlDoc){
    var res = [];
    for(i=0; i<array.length; i++){
        res.push(get_coords(array[i], xmlDoc));
    }
    return res;
}

function segment_refs(waypoint_refs, stop_refs){
    var left = 0;
    var right = 0;
    var started = false;
    var counter =  0;
    var segments = [];

    for(p = 0; p < waypoint_refs.length; p++){
        // try to separate segments between stops
        if(waypoint_refs[p] === stop_refs[counter]){
            counter ++;
            if(started){
                right = p;
                segments.push(waypoint_refs.slice(left, right +1));
                left = p; // starting new segment
            } else {
                left = p;
                started = true;
            }
        }
    }
    return segments;
}

function display_platforms(names, coords, mymap){
    // display platforms
    var markers = [];
    var circle;
    for(p = 0; p < names.length; p++){
        var plat_color = stop_color;
        var plat_fillColor = stop_color;
        if (p === 0) {
            plat_color = 'green';
            plat_fillColor = 'green';
        }
        if (p === names.length -1) {
            plat_color = 'red';
            plat_fillColor = 'red';
        }
        circle = L.circle([coords[p][0], coords[p][1]], {
            color: plat_color,
            fillColor: plat_fillColor,
            fillOpacity: 0.5,
            radius: 15*Math.max(1.5, Math.sqrt(stops_times[p]))
        }).addTo(mymap)
            .bindPopup(names[p]);
    markers.push(circle);
    }
    return markers;
}

function processTiming(timing, stops_lengths){
    var lines = timing.split('\n');
    var str;
    var durations = [];
    var laps = [];
    var current = barstart_x;
    var label_positions = [];
    var interstation_moves = [];
    var interstation_stops = [];
    var stops_times = [];
    var segment_types = [];
    for(var line = lines.length ; line > 0; line--){
        str = lines[line-1];
        if (str.startsWith(timer_keyword_time)){
            str = str.split(': ')[1];
            durations.push(str);
        }
        if (str.startsWith(timer_keyword_name)){
            str = str.split(': ')[1];
            laps.push(str);
        }
    }
    for(var lap = 0; lap < laps.length; lap++){
        str = laps[lap];
        str = str.substring(0, str.length -1);
        var abs_duration = get_seconds(durations[lap]);
        switch (str.substring(0, 1)){
            case red_letter:
                segment_types.push(red_color);
                interstation_stops[interstation_stops.length - 1] += abs_duration;
                break;
            case stop_letter:
                label_positions.push(current);
                segment_types.push(stop_color);
                interstation_moves.push(0);
                interstation_stops.push(0);
                stops_times.push(abs_duration);
                break;
            case inter_letter:
                segment_types.push(inter_color);
                interstation_moves[interstation_moves.length - 1] += abs_duration;
                break;
            default:
                segment_types.push(unknown_color);
        }
    }

    var duration;
    // get total duration of laps
    var total_duration = 0;
    for(lap = 0; lap < durations.length; lap++){
        duration = get_seconds(durations[lap]);
        total_duration += duration;
    }


    var speeds = [];
    var greens = [];
    var reds = [];
    var percs = [];
    var total_interstations = [];
    var segment_colors = [];
    for (var stop = 0; stop < stops_lengths.length; stop++){
        var speed = Math.round((stops_lengths[stop]/(interstation_moves[stop] +interstation_stops[stop]))*3600*10)/10;
        speeds.push(speed);
        var green = Math.min(Math.round(2*255*speed/max_speed), 255);
        greens.push(green);
        var red = Math.min(Math.max(0,Math.round(2*255*(1-speed/max_speed))), 255);
        reds.push(red);
        segment_colors.push("rgb(" + red +"," + green + ",0)");
        var total_interstation = interstation_moves[stop] +interstation_stops[stop] + stops_times[stop];
        total_interstations.push(total_interstation);
        percs.push(Math.round((total_interstation*100/total_duration)*10)/10);
    }

    return [interstation_moves, interstation_stops, stops_times, segment_types, durations,
    speeds, greens, reds, percs, total_interstations, segment_colors, total_duration];
}


Number.prototype.toRad = function() {
   return this * Math.PI / 180;
};

function two_point_length(lat1, lon1, lat2, lon2){
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

function segment_length(segm_array, xmlDoc){
	var s_length = 0;
	var start_p = [];
	var end_p = [];
	for(var k = 0; k < segm_array.length - 1; k++){
		start_p = get_coords(segm_array[k], xmlDoc);
		end_p = get_coords(segm_array[k+1], xmlDoc);
		s_length += two_point_length(start_p[0], start_p[1], end_p[0], end_p[1]);
	}
	return s_length;
}

function join_ways(relation, xmlDoc){
        // get ways and display route
    var way_refs = [];
    var waypoint_refs = [];
    var ways = relation.querySelectorAll('[type="way"]');
    // get way refs
    for(p = 0; p < ways.length; p++){
        way_refs.push(ways[p].getAttribute("ref"));
    }
    // for each way, get point and add to route
    for(p = 0; p < way_refs.length; p++){
        selector = '[id="' + way_refs[p] + '"]';
        var way = xmlDoc.querySelectorAll(selector)[0];
        var way_points = way.getElementsByTagName("nd");
        var current_points = [];
        for (var w = 0; w < way_points.length; w ++){
            var ref = way_points[w].getAttribute("ref");
            current_points.push(ref);
        }

        // first segment
        if(p === 0){
            waypoint_refs = waypoint_refs.concat(current_points);
            continue;
        }
        // last route point === first point of current segment
        if(waypoint_refs[waypoint_refs.length-1] === current_points[0]){
            waypoint_refs = waypoint_refs.concat(current_points);
            continue;
        }
        // last route point === last point of current segment
        if(waypoint_refs[waypoint_refs.length-1] === current_points[current_points.length-1]){
            waypoint_refs = waypoint_refs.concat(current_points.reverse());
            continue;
        }
        // first route point === first point  of current segment
        // it can happen only immediately after first segment
        if(waypoint_refs[0] === current_points[0]){
            waypoint_refs = waypoint_refs.reverse();
            waypoint_refs = waypoint_refs.concat(current_points);
            continue;
        }
        // first route point === last point of current segment
        // it can happen only immediately after first segment
        if(waypoint_refs[0] === current_points[current_points.length-1]){
            waypoint_refs = waypoint_refs.reverse();
            waypoint_refs = waypoint_refs.concat(current_points.reverse());
            continue;
        }
        console.log("ERROR: WAYS NOT CONNECTED!");
        alert("ERROR: WAYS NOT CONNECTED!");

    }
    return waypoint_refs;
}

function createBarchart(segment_types, durations, total_duration, names){
    var adj_c = document.getElementById("adjCanvas");
    var adj_ctx = adj_c.getContext("2d");
    adj_ctx.canvas.width  = window.innerWidth - 30;
    adj_ctx.clearRect(0, 0, adj_ctx.canvas.width, adj_ctx.canvas.height);
    adj_ctx.font = "10px Arial";

    var current = barstart_x;
    var label_positions = [];
    var interstation_moves = [];
    var interstation_stops = [];
    var stops_times = [];
    for(var lap = 0; lap < durations.length; lap++){
        if(segment_types[lap] ===  stop_color){
            label_positions.push(current);
        }
        var abs_duration = get_seconds(durations[lap]);
        var duration = Math.round(abs_duration * (adj_ctx.canvas.width - 20) / total_duration);
        addSegment(adj_ctx, duration, segment_types[lap], current, barstart_y, barwidth);
        current += duration;

    }
    var stop;
    for (stop = 0; stop < names.length; stop++){
        addLabel(adj_ctx, names[stop], label_positions[stop]);
    }
}

function createTable(headers, names, stops_lengths, total_interstations, stops_times, speeds, percs, reds, greens,
    total_duration){
    // find total length of the route
    var total_distance = stops_lengths.reduce(function (a, b) { return a + b; }, 0);

    var data_table = document.createElement("DIV");
    data_table.className = "datatable";
    // header row
    var header_row = document.createElement("DIV");
    header_row.className = "headerrow";

    add_row(headers, header_row);
    data_table.appendChild(header_row);

    for (stop = 0; stop < names.length - 1; stop++){
        var data_row = document.createElement("DIV");
        data_row.className = "datarow";
        var row_text = [names[stop], names[stop+1], stops_lengths[stop].toFixed(3), total_interstations[stop],
        stops_times[stop], speeds[stop], percs[stop]];
        add_row(row_text, data_row);
        data_row.style.backgroundColor = "rgb(" + reds[stop] +"," + greens[stop] + ",0)";
        data_table.appendChild(data_row);
    }
    var rezumat = '';
    rezumat += 'Timp total: ' + convert_from_seconds(total_duration) + '.\n';
    rezumat += 'Distanță totală: ' + Math.round(total_distance*10)/10 + ' km.\n';
    rezumat += 'Viteză medie: ' + Math.round((total_distance/total_duration)*3600*10)/10 + ' km/h.\n';
    displayContents(rezumat);

    document.getElementsByTagName('body')[0].insertBefore(data_table, document.getElementById('mapid'));

}

function makeMap(timing, xmlDoc){
    var names = [];
    //var segments = [];
    var stops_lengths = [];

    // create map
    var mymap = L.map('mapid').setView([44.40, 26.1], 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mymap);

    // extract relation element
    var relation = xmlDoc.getElementsByTagName("relation")[0];
    // get platform refs and stop position refs
    var plat_refs = get_refs('platform', relation);
    var stop_refs = get_refs('stop', relation);
    // join ways to create full route
    var waypoint_refs = join_ways(relation, xmlDoc);
    // create separate route segments
    var segments = segment_refs(waypoint_refs, stop_refs);
    // calculate segment lengths and total distance
    var segm;
    for(var i = 0; i< segments.length; i++){
        segm = segment_length(segments[i], xmlDoc);
        stops_lengths.push(segm);
    }
    // get platform names and coordinates
    var p_coords = [];
    for(p = 0; p < plat_refs.length; p++){
        p_coords.push(get_coords(plat_refs[p], xmlDoc));
        selector = '[id="' + plat_refs[p].toString() + '"]';
        platform = xmlDoc.querySelectorAll(selector)[0];
        names.push(platform.querySelectorAll('[k="name"]')[0].getAttribute("v"));
    }

    // process raw timing data
    var res = processTiming(timing, stops_lengths);
    interstation_moves = res[0];
    interstation_stops = res[1];
    stops_times = res[2];
    segment_types = res[3];
    durations = res[4];
    speeds = res[5];
    greens = res[6];
    reds = res[7];
    percs = res[8];
    total_interstations = res[9];
    segment_colors = res[10];
    total_duration = res[11];


    // create bar chart
    createBarchart(segment_types, durations, total_duration, names);

    // create data table
    createTable(headers, names, stops_lengths, total_interstations, stops_times, speeds, percs, reds, greens,
    total_duration);


    // add route segments to map
    for(i=0; i<segments.length; i++){
        L.polyline(get_array_coords(segments[i], xmlDoc), {color: segment_colors[i], weight: 3}).addTo(mymap);
    }
    // add platforms to map
    var markers = display_platforms(names, p_coords, mymap); // return markers to fit bounds
    var group = new L.featureGroup(markers);
    mymap.fitBounds(group.getBounds());
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
        var overpass_1 = 'http://overpass-api.de/api/interpreter?data=relation(';
        var overpass_2 =');out body;>;out body;rel(bn)["public_transport"="stop_area"];out body;';
        var overpass_full = overpass_1 + routeID + overpass_2;
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