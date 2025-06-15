export interface ToolComponent {
  meta: {
    name: string;
    route: string;
  };
  component: React.LazyExoticComponent<React.ComponentType>;
}
