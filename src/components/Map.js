import React, { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";

const Map = () => {
  const MapEl = useRef(null);

  useEffect(() => {
    loadModules([
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/WFSLayer",
      "esri/layers/ogc/wfsUtils",
      "esri/widgets/LayerList",
    ]).then(([Map, MapView, WFSLayer, wfsUtils, LayerList]) => {
      let wfsCapabilities;

      // set up map and view
      const map = new Map({
        basemap: "gray-vector",
      });

      const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [2.55054, 46.90664],
        zoom: 5,
        popup: {
          defaultPopupTemplateEnabled: true, // popup will be enabled on the wfslayer
        },
      });

      /**
          // create and add a WFSLayer to the map
          const layer = new WFSLayer({
            url: "https://geobretagne.fr/geoserver/ows", // url to your WFS endpoint
            name: "fma:bvme_zhp_vs_culture", // name of the FeatureType
            copyright: "GéoBretagne"
          });
          map.add(layer);
          **/

      // add UI panel to the top-right of the view
      const panel = document.getElementById("panelItem");
      view.ui.add(panel, "top-right");
      // create layerlist and add it to view
      view.ui.add(
        new LayerList({
          view: view,
        }),
        "bottom-left"
      );

      const wfsEndpoint = document.getElementById("endpoint"); // input value containing WFS endpoint url
      const listArea = document.getElementById("listArea");
      const warning = document.getElementById("warning");
      const loader = document.getElementById("loader"); // create loader icon to display while featuretypes are loading
      const capabilitiesBtn = document.getElementById("getCapabilities");
      capabilitiesBtn.addEventListener("click", getCapabilities);

      function getCapabilities() {
        listArea.innerHTML = ""; // clear the list of featuretypes when a new GetCapabilites request is execute
        loader.active = true;
        const url = wfsEndpoint.value;
        if (url) {
          // call get capabilities request on the WFS endpoint
          wfsUtils
            .getCapabilities(url)
            .then((capabilities) => {
              warning.active = false;
              wfsCapabilities = capabilities;
              // create list of featuretypes from the capabilities result
              createLayerList(wfsCapabilities.featureTypes);
            })
            .catch((error) => {
              warning.active = true;
            });
        }
      }

      // create a list from the featureTypes available in the service
      function createLayerList(featureTypes) {
        const list = document.createElement("calcite-pick-list");
        list.filterEnabled = true;
        featureTypes.forEach((feature) => {
          const listitem = document.createElement("calcite-pick-list-item");
          listitem.label = feature.title;
          listitem.value = feature.name;
          list.appendChild(listitem);
        });
        listArea.appendChild(list);
        loader.active = false; // stop loading
        list.addEventListener("calciteListChange", updateSelectedLayer);
      }

      // get information about the selected feature type and add the wfslayer to the map
      function updateSelectedLayer(event) {
        view.popup.close();
        // get the layer name from the clicked item
        const layerName = event.detail.keys().next().value;
        // get layer info for the feature type that was clicked
        wfsUtils
          .getWFSLayerInfo(wfsCapabilities, layerName)
          .then((wfsLayerInfo) => {
            // remove existing layers from the map
            map.layers.removeAll();
            // create a WFSLayer from the layer info
            const layer = WFSLayer.fromWFSLayerInfo(wfsLayerInfo);
            map.add(layer);
            layer.when(() => {
              // zoom to the layer's extent once it loads
              view.goTo(layer.fullExtent);
            });
          });
      }
    });
  }, []);

  return (
    <>
      <calcite-panel id="panelItem" theme="light" scale="s">
        <div style={{ padding: "12px" }}>
          <calcite-label status="idle" scale="s">
            OGC WFS endpoint
            <calcite-input
              id="endpoint"
              type="text"
              status="idle"
              value="https://geobretagne.fr/geoserver/ows"
            ></calcite-input>
          </calcite-label>
          <calcite-button scale="s" slot="input-action" id="getCapabilities">
            GetCapabilities
          </calcite-button>
        </div>
        <calcite-loader id="loader" type="indeterminate"></calcite-loader>
        <calcite-notice
          id="warning"
          color="red"
          icon="exclamation-mark-triangle"
          width="full"
        >
          <div slot="title">Unsupported WFS</div>
          <div slot="message">
            The WFS service must support WFS 2.0.0 and have GeoJSON output
            format enabled.
          </div>
        </calcite-notice>
        <div id="listArea"></div>
      </calcite-panel>
      <div
        id="viewDiv"
        style={{ height: "100vh", width: "100vw" }}
        ref={MapEl}
      ></div>
    </>
  );
};

export default Map;
