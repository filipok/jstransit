var barwidth = 80;
var barstart_x = 10;
var barstart_y = 10;
var text_width = 9;
var max_speed = 40; //km/h

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

function display_platforms(names, coords, mymap){
    // display platforms
    var markers = [];
    var circle;
    for(p = 0; p < names.length; p++){
        var plat_color = 'blue';
        var plat_fillColor = '#0000FF';
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

function process_timing(timing){
    // create arrays of lap names and durations
    //TODO hardcoded?
    var lines = timing.split('\n');
    var str;
    var durations = [];
    var laps = [];
    for(var line = lines.length ; line > 0; line--){
        str = lines[line-1];
        if (str.startsWith('Lap Time')){
            str = str.split(': ')[1];
            durations.push(str);
        }
        if (str.startsWith('Lap Description')){
            str = str.split(': ')[1];
            laps.push(str);
        }
    }
    return [durations, laps];
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
        var current_points = [];
        var way_points = way.getElementsByTagName("nd");
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

function createBarchart(laps, durations, total_duration, adj_ctx){
    // TODO hardcoded?
    var current = barstart_x;
    var stops_names = []; // TODO de scos din OSM!!
    var label_positions = [];
    var interstation_moves = [];
    var interstation_stops = [];
    var stops_times = [];
    for(var lap = 0; lap < laps.length; lap++){
        var str = laps[lap];
        str = str.substring(0, str.length -1);
        var abs_duration = get_seconds(durations[lap]);
        var duration = Math.round(abs_duration * (adj_ctx.canvas.width - 20) / total_duration);

        switch (str.substring(0, 1)){
            case '*':
                addSegment(adj_ctx, duration, 'red', current, barstart_y, barwidth);
                current += duration;
                interstation_stops[interstation_stops.length - 1] += abs_duration;
                break;
            case '@':
                stops_names.push(str.substring(1));
                label_positions.push(current);
                addSegment(adj_ctx, duration, 'aqua', current, barstart_y, 2*barwidth);
                current += duration;
                interstation_moves.push(0);
                interstation_stops.push(0);
                stops_times.push(abs_duration);
                break;
            case '+':
                addSegment(adj_ctx, duration, 'green', current, barstart_y, barwidth);
                current += duration;
                interstation_moves[interstation_moves.length - 1] += abs_duration;
                break;
            default:
                addSegment(adj_ctx, duration, 'black', current, barstart_y, 2*barwidth);
                current += duration;
        }
    }
    var stop;
    for (stop = 0; stop < stops_names.length; stop++){
        addLabel(adj_ctx, stops_names[stop], label_positions[stop]);
    }
    return [stops_names, interstation_moves, interstation_stops, stops_times];
}

function createChart(timing, stops_lengths, total_distance){

    var adj_c = document.getElementById("adjCanvas");
    var adj_ctx = adj_c.getContext("2d");
    adj_ctx.canvas.width  = window.innerWidth - 30;
    adj_ctx.clearRect(0, 0, adj_ctx.canvas.width, adj_ctx.canvas.height);
    adj_ctx.font = "10px Arial";


    var res = process_timing(timing); //get timings
    var durations = res[0];
    var laps = res[1];

    var duration, lap;

    // get total duration of laps
    var total_duration = 0;
    for(lap = 0; lap < laps.length; lap++){
        duration = get_seconds(durations[lap]);
        total_duration += duration;
    }

    // create chart
    var result = createBarchart(laps, durations, total_duration, adj_ctx);
    var stops_names = result[0];
    var interstation_moves = result[1];
    var interstation_stops = result[2];
    var stops_times = result[3];
    var segment_colors = [];

    console.log(stops_times.length, " stații cronometrate."); // stops_times cam global

    var data_table = document.createElement("DIV");
    data_table.className = "datatable";
    // header row
    var header_row = document.createElement("DIV");
    header_row.className = "headerrow";

    var headers = ["De la", "La", "Distanță (km)", "Total (s)",
        "D/c stație (s)", "V (km/h)", "Pondere (%)"];
    add_row(headers, header_row);
    data_table.appendChild(header_row);


    for (var stop = 0; stop < stops_names.length - 1; stop++){
        var data_row = document.createElement("DIV");
        data_row.className = "datarow";
        var total_interstation = interstation_moves[stop] +interstation_stops[stop] + stops_times[stop];
        var speed = Math.round((stops_lengths[stop]/(total_interstation-stops_times[stop]))*3600*10)/10;
        var green = Math.min(Math.round(2*255*speed/max_speed), 255);
        var red = Math.min(Math.max(0,Math.round(2*255*(1-speed/max_speed))), 255);
        var perc = Math.round((total_interstation*100/total_duration)*10)/10;
        var row_text = [stops_names[stop], stops_names[stop+1], stops_lengths[stop].toFixed(3), total_interstation,
        stops_times[stop], speed, perc];
        add_row(row_text, data_row);
        segment_colors.push("rgb(" + red +"," + green + ",0)");
        data_row.style.backgroundColor = "rgb(" + red +"," + green + ",0)";
        data_table.appendChild(data_row);
    }
    var rezumat = '';
    rezumat += 'Timp total: ' + convert_from_seconds(total_duration) + '.\n';
    rezumat += 'Distanță totală: ' + Math.round(total_distance*10)/10 + ' km.\n';
    rezumat += 'Viteză medie: ' + Math.round((total_distance/total_duration)*3600*10)/10 + ' km/h.\n';
    displayContents(rezumat);

    document.getElementsByTagName('body')[0].insertBefore(data_table, document.getElementById('mapid'));
    return [stops_times, segment_colors];

}

function makeMap(timing, xmlDoc){
    var names = [];
    var point_lats = [];
    var point_longs = [];
    var segments = [];
    var new_stops_length = [];
    var total_distance = 0;

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

    // create lat and long arrays for the route

    var p_coords = [];

    var left = 0;
    var right = 0;
    var started = false;
    var counter =  0;

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
    console.log('Nr. interstatii: ', segments.length);
    var segm;
    for(var i = 0; i< segments.length; i++){
        segm = segment_length(segments[i], xmlDoc);
        new_stops_length.push(segm);
        total_distance += segm;
    }
    console.log(new_stops_length);

    // create chart and return stop times used to display stops
    // TODO separate loops to extract  and display data
    var res = createChart(timing, new_stops_length, total_distance);
    stops_times = res[0];
    segment_colors = res[1];

    for(i=0; i<segments.length; i++){
        L.polyline(get_array_coords(segments[i], xmlDoc), {color: segment_colors[i], weight: 3}).addTo(mymap);
    }

    // get platform names and coordinates
    for(p = 0; p < plat_refs.length; p++){
        p_coords.push(get_coords(plat_refs[p], xmlDoc));
        selector = '[id="' + plat_refs[p].toString() + '"]';
        platform = xmlDoc.querySelectorAll(selector)[0];
        names.push(platform.querySelectorAll('[k="name"]')[0].getAttribute("v"));
    }

    var markers = display_platforms(names, p_coords, mymap); // markers to fit bounds
    var group = new L.featureGroup(markers);
    mymap.fitBounds(group.getBounds());


    console.log(names.length, " stații descărcate de pe OSM.");
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
        //var routeName = r.options[r.selectedIndex].text;
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