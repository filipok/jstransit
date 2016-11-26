var barwidth = 80;
var barstart_x = 10;
var barstart_y = 10;
var text_width = 9;
var date_traseu = '';
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

function add_data_cell(text) {
    var data_cell = document.createElement("DIV");
    data_cell.className = "datacell";
    var data_text = document.createTextNode(text);
    data_cell.appendChild(data_text);
    return data_cell;
}

function euclidean_distance(x, y, a, b){
    return Math.sqrt(Math.pow(a-x, 2) + Math.pow(b-y, 2));
}

function get_coords(ref, xmlDoc){
    selector = '[id="' + ref + '"]';
    node = xmlDoc.querySelectorAll(selector)[0];
    lat = parseFloat(node.getAttribute("lat"));
    lon = parseFloat(node.getAttribute("lon"));
    return [lat, lon];
}
function readRouteFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        date_traseu = e.target.result;
    };
    reader.readAsText(file);
}

function readTimerFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;
        var lines = contents.split('\n');

        var adj_c = document.getElementById("adjCanvas");
        var adj_ctx = adj_c.getContext("2d");
        adj_ctx.canvas.width  = window.innerWidth - 30;
        adj_ctx.clearRect(0, 0, adj_ctx.canvas.width, adj_ctx.canvas.height);
        adj_ctx.font = "10px Arial";

        var durations = [];
        var laps = [];
        var interstation_moves = [];
        var interstation_stops = [];
        var stops_times = [];
        var total_duration = 0;
        var label_positions = [];
        var stops_names = [];
        var stops_lengths = [];
        var total_distance = 0;

        var plat_refs = [];
        var way_refs = [];
        var waypoint_refs = [];
        var lats =[];
        var longs = [];
        var names = [];
        var point_lats = [];
        var point_longs = [];




        // process date_traseu
        var traseu_stops = date_traseu.split('\n');
        for (var k = 1; k < traseu_stops.length; k++){
            var temp = parseFloat(traseu_stops[k].split('\t')[1]);
            stops_lengths.push(temp);
            total_distance += temp;
        }

        // create arrays of lap names and durations
        var str, duration, lap;
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
        // get total duration of laps
        for(lap = 0; lap < laps.length; lap++){
            duration = get_seconds(durations[lap]);
            total_duration += duration;
        }
        // create chart
        var current = barstart_x;
        for(lap = 0; lap < laps.length; lap++){
            str = laps[lap];
            str = str.substring(0, str.length -1);
            var abs_duration = get_seconds(durations[lap]);
            duration = Math.round(abs_duration * (adj_ctx.canvas.width - 20) / total_duration);

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
        console.log(stops_times.length, " stații cronometrate.");
        // Add stop labels and display output data
        var data_table = document.createElement("DIV");
        data_table.className = "datatable";
        // header row
        var header_row = document.createElement("DIV");
        header_row.className = "headerrow";
        header_row.appendChild(add_data_cell("De la"));
        header_row.appendChild(add_data_cell("La"));
        header_row.appendChild(add_data_cell("Distanță (km)"));
        header_row.appendChild(add_data_cell("Total (s)"));
        header_row.appendChild(add_data_cell("D/c stație (s)"));
        header_row.appendChild(add_data_cell("V (km/h)"));
        header_row.appendChild(add_data_cell("Pondere (%)"));
        data_table.appendChild(header_row);

        var stop;
        for (stop = 0; stop < stops_names.length; stop++){
            addLabel(adj_ctx, stops_names[stop], label_positions[stop]);
        }
        for (stop = 0; stop < stops_names.length - 1; stop++){
            var data_row = document.createElement("DIV");
            data_row.className = "datarow";
            data_row.appendChild(add_data_cell(stops_names[stop]));
            data_row.appendChild(add_data_cell(stops_names[stop+1]));
            data_row.appendChild(add_data_cell(stops_lengths[stop]));
            var total_interstation = interstation_moves[stop] +interstation_stops[stop] + stops_times[stop];
            data_row.appendChild(add_data_cell(total_interstation));
            data_row.appendChild(add_data_cell(stops_times[stop]));
            var speed = Math.round((stops_lengths[stop]/(total_interstation-stops_times[stop]))*3600*10)/10;
            data_row.appendChild(add_data_cell(speed));
            var green = Math.min(Math.round(2*255*speed/max_speed), 255);
            var red = Math.min(Math.max(0,Math.round(2*255*(1-speed/max_speed))), 255);
            data_row.style.backgroundColor = "rgb(" + red +"," + green + ",0)";
            var perc = Math.round((total_interstation*100/total_duration)*10)/10;
            data_row.appendChild(add_data_cell(perc));
            data_table.appendChild(data_row);
        }
        var rezumat = '';
        rezumat += 'Timp total: ' + convert_from_seconds(total_duration) + '.\n';
        rezumat += 'Distanță totală: ' + Math.round(total_distance*10)/10 + ' km.\n';
        rezumat += 'Viteză medie: ' + Math.round((total_distance/total_duration)*3600*10)/10 + ' km/h.\n';
        displayContents(rezumat);

        document.getElementsByTagName('body')[0].insertBefore(data_table, document.getElementById('mapid'));

        // read chosen route
        var r = document.getElementById("route");
        var routeID = r.options[r.selectedIndex].value;
        //var routeName = r.options[r.selectedIndex].text;
        var overpass_1 = 'http://overpass-api.de/api/interpreter?data=relation(';
        var overpass_2 =');out body;>;out body;rel(bn)["public_transport"="stop_area"];out body;';
        var overpass_full = overpass_1 + routeID + overpass_2;

        //obtain platform list and display on the map
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {

                var xmlDoc = this.responseXML;

                // create map
                var mymap = L.map('mapid').setView([44.40, 26.1], 13); // center pe traseu!!
                L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(mymap);
                // extract relation element
                var relation = xmlDoc.getElementsByTagName("relation")[0];

                // get platform refs
                var p, selector, platform, lat, lon;
                var platforms = relation.querySelectorAll('[role="platform"]');
                for(p = 0; p < platforms.length; p++){
                    plat_refs.push(platforms[p].getAttribute("ref"));
                }


                // get ways and display route
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
                        //waypoint_refs.push(ref);

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
                // create lat and long arrays for the route
                for(p = 0; p < waypoint_refs.length; p++){
                    selector = '[id="' + waypoint_refs[p] + '"]';
                    platform = xmlDoc.querySelectorAll(selector)[0];
                    lat = parseFloat(platform.getAttribute("lat"));
                    point_lats.push(lat);
                    lon = parseFloat(platform.getAttribute("lon"));
                    point_longs.push(lon);
                }
                var coords = [];
                for(var m = 0; m < point_lats.length; m++){
                    coords.push([point_lats[m], point_longs[m]]);
                }
                // TODO map.setView() after getBounds() or
                // TODO from coordinates with max/min
                // actually display the route
                var polyline = L.polyline(coords, {color: 'red'}).addTo(mymap);

                // TODO prima statie verde, ultima rosie
                // get platform names and coordinates and display them
                for(p = 0; p < plat_refs.length; p++){
                    selector = '[id="' + plat_refs[p].toString() + '"]';
                    platform = xmlDoc.querySelectorAll(selector)[0];
                    lat = parseFloat(platform.getAttribute("lat"));
                    lats.push(lat);
                    lon = parseFloat(platform.getAttribute("lon"));
                    longs.push(lon);
                    var name = platform.querySelectorAll('[k="name"]')[0].getAttribute("v");
                    names.push(name);
                    // display platforms
                    var circle = L.circle([lat, lon], {
                        color: 'blue',
                        fillColor: '#0000FF',
                        fillOpacity: 0.5,
                        radius: 15*Math.max(1.5, Math.sqrt(stops_times[p]))
                    }).addTo(mymap)
                        .bindPopup(name);
                }

                // get stop_positions
                var relations = xmlDoc.getElementsByTagName("relation");
                console.log(names.length, " stații descărcate de pe OSM.");

            } // end main if
        }; // end onreadystatechange function definition
        xhttp.open("GET", overpass_full, true);
        xhttp.send();
    }; // end onload function definition
    reader.readAsText(file);
}
document.getElementById('timer-file-input').addEventListener('change', readTimerFile, false);
document.getElementById('route-file-input').addEventListener('change', readRouteFile, false);