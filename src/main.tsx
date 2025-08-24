import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./main.css";

import { ToolComponent } from "./types/ToolComponent";
import Menu from "./pageComponents/Menu";
import Footer from "./pageComponents/Footer";

// Dynamic imports for all pages and tools
const HomePage = React.lazy(() => import("./HomePage"));
const JSONToGEOJSON = React.lazy(() => import("./tools/JSONToGEOJSON/JSONToGEOJSON"));
const HandlebarsTemplate = React.lazy(() => import("./tools/Handlebars/HandlebarsTemplate"));
const WeightedDistribution = React.lazy(() => import("./tools/WeightedDistribution/WeightedDistribution"));
const ICALToCalendars = React.lazy(() => import("./tools/ICALToCalendars/ICALToCalendarsConverter"));
const DayList = React.lazy(() => import("./tools/DayList/DayList"));
const ExifExtractor = React.lazy(() => import("./tools/ExifExtractor/ExifExtractor"));
const ListComparisonTool = React.lazy(() => import("./tools/ListTool/ListComparisonTool"));
const VitaminCalculator = React.lazy(() => import("./tools/vitaminCalc/vitaminCalc"));

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-64">Loading...</div>
);

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
  {
    meta: {
      name: "Vitamin Calculator",
      route: "/vitamin-calculator",
    },
    component: VitaminCalculator,
  },
];

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <HomePage />
      </Suspense>
    ),
  },
  ...tools.map(({ meta, component }) => ({
    path: meta.route,
    element: (
      <Suspense fallback={<LoadingFallback />}>
        {React.createElement(component)}
      </Suspense>
    ),
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
