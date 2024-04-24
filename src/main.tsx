import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import JSONToGEOJSON from './tools/JSONToGEOJSON/JSONToGEOJSON';

import './main.css';
import { ToolComponent } from './types/ToolComponent';
import Menu from './pageComonents/Menu';
import Footer from './pageComonents/Footer';



const tools: ToolComponent[] = [
  {
    meta: {
      name: 'JSON to GEOJSON',
      route: '/json-to-geojson'
    },
    component: JSONToGEOJSON
  }
]

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (<h1 className="text-3xl font-bold underline">Home</h1>)
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
