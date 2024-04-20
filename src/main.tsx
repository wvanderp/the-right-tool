import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import JSONToGEOJSON from './tools/JSONToGEOJSON/JSONToGEOJSON';

interface ToolComponent {
  meta: {
    name: string;
    route: string;
  };
  component: React.ComponentType;
}

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
  tools.map(({ meta, component }) => ({
    path: meta.route,
    element: React.createElement(component),
  }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
