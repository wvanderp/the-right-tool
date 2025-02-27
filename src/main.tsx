import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import './main.css';

import { ToolComponent } from './types/ToolComponent';
import Menu from './pageComponents/Menu';
import Footer from './pageComponents/Footer';
import HomePage from './HomePage';

import JSONToGEOJSON from './tools/JSONToGEOJSON/JSONToGEOJSON';
import HandlebarsTemplate from './tools/Handlebars/HandlebarsTemplate';
import WeightedDistribution from './tools/WeightedDistribution/WeightedDistribution';
import CharacterInfo from './tools/CharacterInfo/CharacterInfo';

const tools: ToolComponent[] = [
  {
    meta: {
      name: 'JSON to GEOJSON',
      route: '/json-to-geojson'
    },
    component: JSONToGEOJSON
  },
  {
    meta: {
      name: 'Handlebars Template',
      route: '/handlebars'
    },
    component: HandlebarsTemplate
  },
  {
    meta: {
      name: 'Weighted Distribution',
      route: '/weighted-distribution'
    },
    component: WeightedDistribution
  },
  {
    meta: {
      name: 'Character Info',
      route: '/character-info'
    },
    component: CharacterInfo
  }
]

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (<HomePage />)
    },
    ...tools.map(({ meta, component }) => ({
      path: meta.route,
      element: React.createElement(component),
    }))
  ]
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="flex">
      <Menu tools={tools} />
      <RouterProvider router={router} />
      <Footer />
    </div>
  </React.StrictMode>,
)
