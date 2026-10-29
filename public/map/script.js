import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
	style: `https://tiles.openfreemap.org/styles/liberty`,
	center: [-111.6548992, 35.1843475],
	zoom: 15.5,
	pitch: 0,
	bearing: 0,
	container: 'map',
	canvasContextAttributes: {antialias: true}
});

map.on('load', () => {

});