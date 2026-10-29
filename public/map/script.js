import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";

const map = new maplibregl.Map({
	style: `https://tiles.openfreemap.org/styles/bright`,
	center: [-111.6548992, 35.1843475],
	zoom: 15.5,
	pitch: 0,
	bearing: 0,
	container: "map",
	canvasContextAttributes: { antialias: true },
});

map.on('load', () => {
	map.setProjection({
		type: "globe"
	})

	map.addSource("hillshade", {
		type: "raster-dem",
		url: "https://tiles.mapterhorn.com/tilejson.json"
	});

	map.addControl(
		new maplibregl.NavigationControl({
			visualizePitch: true,
			showZoom: true,
			showCompass: true
		})
	);

    const layers = map.getStyle().layers;

    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    map.addSource('openfreemap', {
        url: `https://tiles.openfreemap.org/planet`,
        type: 'vector',
    });

    map.addLayer(
        {
            'id': '3d-buildings',
            'source': 'openfreemap',
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 14,
            'filter': ['!=', ['get', 'hide_3d'], true],
            'paint': {
                'fill-extrusion-color': '#FFFFFF',
				'fill-extrusion-height': ['get', 'render_height'],
				'fill-extrusion-opacity': 1.0
            }
        },
        labelLayerId
    );

	map.addLayer({
		id: "hills",
		type: "hillshade",
		source: "hillshade",
		layout: { visibility: "visible" },
		paint: { "hillshade-shadow-color": "#473B24" }
	}, '3d-buildings');
});