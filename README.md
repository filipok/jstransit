# jstransit
jstransit uses [Leaflet](http://leafletjs.com/) to display public transport relations ([v2](http://wiki.openstreetmap.org/wiki/Proposed_features/Public_Transport)) from Openstreetmap using the [Overpass API](http://wiki.openstreetmap.org/wiki/Overpass_API). 
If you time a certain PT route, you can use jstransit to display the speed for each segment and various other statistics.

# Examples
See several examples in the examples folder:
- [multiple.html](examples/multiple.html) displays several public transport relations in Bucharest, Romania;
- [one_trip.html](examples/one_trip.html) displays statistics for a trip made with Bus 117 in Bucharest in October 2016;
- [routes.html](examples/routes.html) lets you choose a PT relation and a timing file from [examples/timings](examples/timings) to display statistics for the trip. 

# TODO
- document timing format (but you have some examples)
- add route tooltip
- document other stuff

# Screenshots
![multiple routes](examples/screenshots/01.PNG)
![station tooltip](examples/screenshots/02.PNG)
![stats](examples/screenshots/03.PNG)
![choose route and timing](examples/screenshots/04.png)