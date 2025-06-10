import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./main.css";

import { ToolComponent } from "./types/ToolComponent";
import Menu from "./pageComponents/Menu";
import Footer from "./pageComponents/Footer";
import HomePage from "./HomePage";

import JSONToGEOJSON from "./tools/JSONToGEOJSON/JSONToGEOJSON";
import HandlebarsTemplate from "./tools/Handlebars/HandlebarsTemplate";
import WeightedDistribution from "./tools/WeightedDistribution/WeightedDistribution";
import ICALToCalendars from "./tools/ICALToCalendars/ICALToCalendarsConverter";
import DayList from "./tools/DayList/DayList";
import ExifExtractor from "./tools/ExifExtractor/ExifExtractor";
import ListComparisonTool from "./tools/ListTool/ListComparisonTool";

const tools: ToolComponent[] = [
  {
    meta: {
      name: "JSON to GEOJSON",
      route: "/json-to-geojson",
    },
    component: JSONToGEOJSON,
  },
  {
    meta: {
      name: "Handlebars Template Generator",
      route: "/handlebars-templater",
    },
    component: HandlebarsTemplate,
  },
  {
    meta: {
      name: "Weighted Distribution Calculator",
      route: "/weighted-distribution-calculator",
    },
    component: WeightedDistribution,
  },
  {
    meta: {
      name: "Calendar Event Converter",
      route: "/calendar-event-converter",
    },
    component: ICALToCalendars,
  },
  {
    meta: {
      name: "Day List Generator",
      route: "/day-list",
    },
    component: DayList,
  },
  {
    meta: {
      name: "EXIF Data Extractor",
      route: "/exif-data-extractor",
    },
    component: ExifExtractor,
  },
  {
    meta: {
      name: "List Comparison Tool",
      route: "/list-comparison",
    },
    component: ListComparisonTool,
  },
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  ...tools.map(({ meta, component }) => ({
    path: meta.route,
    element: React.createElement(component),
  })),
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex flex-col md:flex-row flex-grow">
        <Menu tools={tools} />
        <main className="flex-1 px-4 md:px-6 lg:px-8 pt-20 md:pt-6">
          <div className="max-w-6xl mx-auto">
            <RouterProvider router={router} />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  </React.StrictMode>
);
